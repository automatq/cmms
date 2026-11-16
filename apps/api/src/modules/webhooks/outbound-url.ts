import { BadRequestException } from '@nestjs/common';
import * as dns from 'dns';
import * as http from 'http';
import * as https from 'https';
import { BlockList, isIP } from 'net';

/**
 * Outbound-request guard for tenant-configured URLs (webhooks).
 *
 * Blocks requests to loopback, private, link-local (incl. cloud metadata at
 * 169.254.169.254), CGNAT, multicast and other non-public ranges. The check is
 * done inside the HTTP agent's DNS `lookup`, so the address that is validated
 * is exactly the address that is connected to (no DNS-rebinding window).
 * Redirects are not followed by callers, so a public URL can't bounce the
 * request to an internal one.
 */

const blocked = new BlockList();
for (const [net, prefix] of [
  ['0.0.0.0', 8], // "this" network
  ['10.0.0.0', 8], // private
  ['100.64.0.0', 10], // CGNAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local / cloud metadata
  ['172.16.0.0', 12], // private
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.0.2.0', 24], // TEST-NET-1
  ['192.168.0.0', 16], // private
  ['198.18.0.0', 15], // benchmarking
  ['198.51.100.0', 24], // TEST-NET-2
  ['203.0.113.0', 24], // TEST-NET-3
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved + broadcast
] as const) {
  blocked.addSubnet(net, prefix, 'ipv4');
}
for (const [net, prefix] of [
  ['::', 128], // unspecified
  ['::1', 128], // loopback
  ['64:ff9b::', 96], // NAT64 (can map to private v4)
  ['100::', 64], // discard
  ['2001:db8::', 32], // documentation
  ['fc00::', 7], // unique local
  ['fe80::', 10], // link-local
  ['ff00::', 8], // multicast
] as const) {
  blocked.addSubnet(net, prefix, 'ipv6');
}

/** True if `address` is an IP literal in a non-public range. */
export function isBlockedAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 0) return true; // not an IP: refuse rather than guess
  if (family === 6) {
    // IPv4-mapped / compatible IPv6 (::ffff:10.0.0.1) -> check the v4 part.
    const mapped = address.match(/^::(?:ffff:)?(\d+\.\d+\.\d+\.\d+)$/i);
    if (mapped) return blocked.check(mapped[1], 'ipv4');
    return blocked.check(address, 'ipv6');
  }
  return blocked.check(address, 'ipv4');
}

function allowHttp(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.WEBHOOK_ALLOW_HTTP === 'true';
}

/** Allow private targets only when explicitly enabled (local development). */
function allowPrivate(): boolean {
  return process.env.WEBHOOK_ALLOW_PRIVATE_TARGETS === 'true';
}

/**
 * Synchronous shape/protocol validation plus an up-front DNS check so users
 * get immediate feedback when saving a webhook. Delivery re-checks at connect
 * time via `safeLookup`.
 */
export async function assertSafeOutboundUrl(raw: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new BadRequestException('Invalid URL');
  }
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && allowHttp())) {
    throw new BadRequestException('Webhook URL must use https');
  }
  if (url.username || url.password) {
    throw new BadRequestException('Webhook URL must not contain credentials');
  }
  if (allowPrivate()) return;

  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(host)
    ? [host]
    : await dns.promises
        .lookup(host, { all: true, verbatim: true })
        .then((r) => r.map((a) => a.address))
        .catch(() => {
          throw new BadRequestException(`Could not resolve webhook host ${host}`);
        });
  if (addresses.length === 0 || addresses.some(isBlockedAddress)) {
    throw new BadRequestException('Webhook URL must point to a public internet address');
  }
}

/**
 * `lookup` for http(s).Agent: resolves the host and refuses to connect if ANY
 * resolved address is non-public.
 */
export const safeLookup: typeof dns.lookup = ((
  hostname: string,
  options: any,
  callback: (...args: any[]) => void,
) => {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  dns.lookup(hostname, { ...options, all: true, verbatim: true }, (err, results: any) => {
    if (err) return callback(err);
    const list: dns.LookupAddress[] = Array.isArray(results) ? results : [results];
    if (!allowPrivate() && (list.length === 0 || list.some((r) => isBlockedAddress(r.address)))) {
      const e: NodeJS.ErrnoException = new Error(`Blocked request to non-public address for ${hostname}`);
      e.code = 'EBLOCKEDADDRESS';
      return callback(e);
    }
    if (options?.all) return callback(null, list);
    return callback(null, list[0].address, list[0].family);
  });
}) as any;

export const safeHttpAgent = new http.Agent({ lookup: safeLookup });
export const safeHttpsAgent = new https.Agent({ lookup: safeLookup });
