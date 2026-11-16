import * as dns from 'dns';
import { assertSafeOutboundUrl, isBlockedAddress, safeLookup } from './outbound-url';

describe('isBlockedAddress', () => {
  it.each([
    '127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254',
    '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:10.0.0.1', '::ffff:127.0.0.1',
  ])('blocks %s', (ip) => expect(isBlockedAddress(ip)).toBe(true));

  it.each(['8.8.8.8', '1.1.1.1', '172.32.0.1', '2606:4700:4700::1111'])('allows %s', (ip) =>
    expect(isBlockedAddress(ip)).toBe(false),
  );
});

describe('assertSafeOutboundUrl', () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
    jest.restoreAllMocks();
  });

  it.each([
    'https://127.0.0.1/hook',
    'https://169.254.169.254/latest/meta-data/',
    'https://[::1]/hook',
    'https://user:pass@example.com/hook',
  ])('rejects %s', async (url) => {
    await expect(assertSafeOutboundUrl(url)).rejects.toThrow();
  });

  it('rejects hostnames that resolve to private addresses', async () => {
    jest.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '10.0.0.5', family: 4 }] as any);
    await expect(assertSafeOutboundUrl('https://maintek-minio.railway.internal/x')).rejects.toThrow(
      /public internet address/,
    );
  });

  it('accepts public https hosts', async () => {
    jest.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '93.184.216.34', family: 4 }] as any);
    await expect(assertSafeOutboundUrl('https://hooks.example.com/x')).resolves.toBeUndefined();
  });

  it('requires https in production', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.WEBHOOK_ALLOW_HTTP;
    await expect(assertSafeOutboundUrl('http://hooks.example.com/x')).rejects.toThrow(/https/);
  });
});

describe('safeLookup (connect-time check, defeats DNS rebinding)', () => {
  // Real resolver, no network: 'localhost' resolves via /etc/hosts and IP
  // literals resolve to themselves.
  it('refuses to connect when the host resolves to a private address', (done) => {
    safeLookup('localhost', {}, (err: any) => {
      expect(err?.code).toBe('EBLOCKEDADDRESS');
      done();
    });
  });

  it('connects to public addresses', (done) => {
    safeLookup('93.184.216.34', {}, (err: any, address: string) => {
      expect(err).toBeNull();
      expect(address).toBe('93.184.216.34');
      done();
    });
  });
});
