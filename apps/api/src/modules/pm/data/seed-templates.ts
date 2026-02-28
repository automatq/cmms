/**
 * Pre-built checklist templates for common maintenance tasks.
 * These are seeded as "library" templates that tenants can copy into their own account.
 */
export interface SeedTemplate {
  name: string;
  description: string;
  category: string;
  items: Array<{
    step: number;
    instruction: string;
    requiresPhoto?: boolean;
    requiresValue?: boolean;
    unit?: string;
    passFail?: boolean;
  }>;
}

export const SEED_TEMPLATES: SeedTemplate[] = [
  // ========== HVAC ==========
  {
    name: 'HVAC Unit - Monthly Inspection',
    description: 'Monthly preventive maintenance checklist for commercial HVAC units.',
    category: 'HVAC',
    items: [
      { step: 1, instruction: 'Inspect and replace air filters if dirty', passFail: true },
      { step: 2, instruction: 'Check thermostat operation and calibration', passFail: true },
      { step: 3, instruction: 'Inspect condensate drain for blockages', passFail: true },
      { step: 4, instruction: 'Check refrigerant levels', requiresValue: true, unit: 'PSI' },
      { step: 5, instruction: 'Inspect electrical connections and tighten', passFail: true },
      { step: 6, instruction: 'Lubricate moving parts (motors, bearings)', passFail: true },
      { step: 7, instruction: 'Inspect belt condition and tension', passFail: true },
      { step: 8, instruction: 'Record supply air temperature', requiresValue: true, unit: '°F' },
      { step: 9, instruction: 'Record return air temperature', requiresValue: true, unit: '°F' },
      { step: 10, instruction: 'Take photo of unit condition', requiresPhoto: true },
    ],
  },
  {
    name: 'HVAC - Quarterly Coil Cleaning',
    description: 'Quarterly cleaning and inspection of evaporator and condenser coils.',
    category: 'HVAC',
    items: [
      { step: 1, instruction: 'Shut down and lock out unit', passFail: true },
      { step: 2, instruction: 'Clean evaporator coil with approved cleaner', passFail: true },
      { step: 3, instruction: 'Clean condenser coil with approved cleaner', passFail: true },
      { step: 4, instruction: 'Straighten bent fins', passFail: true },
      { step: 5, instruction: 'Inspect and clean drain pan', passFail: true },
      { step: 6, instruction: 'Verify proper airflow after cleaning', passFail: true },
      { step: 7, instruction: 'Photo of coils after cleaning', requiresPhoto: true },
    ],
  },

  // ========== ELECTRICAL ==========
  {
    name: 'Electrical Panel - Annual Inspection',
    description: 'Annual inspection checklist for electrical distribution panels.',
    category: 'Electrical',
    items: [
      { step: 1, instruction: 'Perform thermal scan of panel (IR camera)', requiresPhoto: true },
      { step: 2, instruction: 'Inspect for signs of overheating or discoloration', passFail: true },
      { step: 3, instruction: 'Verify all breaker labels are accurate', passFail: true },
      { step: 4, instruction: 'Tighten all electrical connections', passFail: true },
      { step: 5, instruction: 'Check for any moisture or corrosion', passFail: true },
      { step: 6, instruction: 'Verify panel covers and blanks are in place', passFail: true },
      { step: 7, instruction: 'Test main breaker operation', passFail: true },
      { step: 8, instruction: 'Record voltage L1-L2', requiresValue: true, unit: 'V' },
      { step: 9, instruction: 'Record voltage L2-L3', requiresValue: true, unit: 'V' },
      { step: 10, instruction: 'Record voltage L1-L3', requiresValue: true, unit: 'V' },
    ],
  },
  {
    name: 'Emergency Lighting - Monthly Test',
    description: 'Monthly functional test of emergency and exit lighting.',
    category: 'Electrical',
    items: [
      { step: 1, instruction: 'Activate test switch for 30 seconds', passFail: true },
      { step: 2, instruction: 'Verify all lamps illuminate', passFail: true },
      { step: 3, instruction: 'Check battery charge indicator', passFail: true },
      { step: 4, instruction: 'Inspect housing for damage or dirt', passFail: true },
      { step: 5, instruction: 'Replace any burnt-out lamps', passFail: true },
    ],
  },

  // ========== PUMPS ==========
  {
    name: 'Centrifugal Pump - Monthly Inspection',
    description: 'Monthly inspection and maintenance for centrifugal pumps.',
    category: 'Pumps',
    items: [
      { step: 1, instruction: 'Check for unusual vibration or noise', passFail: true },
      { step: 2, instruction: 'Record suction pressure', requiresValue: true, unit: 'PSI' },
      { step: 3, instruction: 'Record discharge pressure', requiresValue: true, unit: 'PSI' },
      { step: 4, instruction: 'Check packing gland or mechanical seal for leaks', passFail: true },
      { step: 5, instruction: 'Record motor amperage', requiresValue: true, unit: 'A' },
      { step: 6, instruction: 'Check bearing temperature', requiresValue: true, unit: '°F' },
      { step: 7, instruction: 'Inspect coupling alignment', passFail: true },
      { step: 8, instruction: 'Lubricate bearings per schedule', passFail: true },
      { step: 9, instruction: 'Check foundation bolts for tightness', passFail: true },
    ],
  },

  // ========== FIRE SAFETY ==========
  {
    name: 'Fire Extinguisher - Monthly Inspection',
    description: 'Monthly visual inspection of portable fire extinguishers per NFPA 10.',
    category: 'Fire Safety',
    items: [
      { step: 1, instruction: 'Verify extinguisher is in designated location', passFail: true },
      { step: 2, instruction: 'Verify access is not obstructed', passFail: true },
      { step: 3, instruction: 'Check pressure gauge is in green zone', passFail: true },
      { step: 4, instruction: 'Inspect pin and tamper seal are intact', passFail: true },
      { step: 5, instruction: 'Check for visible damage, corrosion, or leakage', passFail: true },
      { step: 6, instruction: 'Verify inspection tag is current', passFail: true },
      { step: 7, instruction: 'Clean unit if dirty', passFail: true },
    ],
  },
  {
    name: 'Fire Alarm System - Quarterly Test',
    description: 'Quarterly inspection and testing of fire alarm system components.',
    category: 'Fire Safety',
    items: [
      { step: 1, instruction: 'Notify monitoring company before testing', passFail: true },
      { step: 2, instruction: 'Test 25% of smoke detectors (rotate quarterly)', passFail: true },
      { step: 3, instruction: 'Test pull stations', passFail: true },
      { step: 4, instruction: 'Verify alarm notification appliances (horns/strobes)', passFail: true },
      { step: 5, instruction: 'Check battery backup voltage', requiresValue: true, unit: 'V' },
      { step: 6, instruction: 'Review trouble signals on panel', passFail: true },
      { step: 7, instruction: 'Notify monitoring company testing complete', passFail: true },
      { step: 8, instruction: 'Photo of panel showing normal status', requiresPhoto: true },
    ],
  },

  // ========== CONVEYOR ==========
  {
    name: 'Belt Conveyor - Weekly Inspection',
    description: 'Weekly preventive maintenance for belt conveyor systems.',
    category: 'Conveyor',
    items: [
      { step: 1, instruction: 'Inspect belt for wear, cuts, or fraying', passFail: true },
      { step: 2, instruction: 'Check belt tracking and alignment', passFail: true },
      { step: 3, instruction: 'Inspect rollers for proper rotation', passFail: true },
      { step: 4, instruction: 'Check belt tension', passFail: true },
      { step: 5, instruction: 'Inspect drive motor and gearbox for leaks', passFail: true },
      { step: 6, instruction: 'Check emergency stop functionality', passFail: true },
      { step: 7, instruction: 'Inspect guards and safety devices', passFail: true },
      { step: 8, instruction: 'Clean debris from tail/head pulleys', passFail: true },
    ],
  },

  // ========== VEHICLE / FLEET ==========
  {
    name: 'Vehicle - Pre-Trip Inspection',
    description: 'Daily pre-trip inspection checklist for fleet vehicles.',
    category: 'Vehicle',
    items: [
      { step: 1, instruction: 'Check engine oil level', passFail: true },
      { step: 2, instruction: 'Check coolant level', passFail: true },
      { step: 3, instruction: 'Check tire pressure and condition', passFail: true },
      { step: 4, instruction: 'Record odometer reading', requiresValue: true, unit: 'miles' },
      { step: 5, instruction: 'Test all lights (headlights, brake, turn signals)', passFail: true },
      { step: 6, instruction: 'Test horn', passFail: true },
      { step: 7, instruction: 'Check windshield wipers and washer fluid', passFail: true },
      { step: 8, instruction: 'Inspect brakes (visual and pedal feel)', passFail: true },
      { step: 9, instruction: 'Check mirrors and adjust', passFail: true },
      { step: 10, instruction: 'Note any body damage', requiresPhoto: true },
    ],
  },
  {
    name: 'Vehicle - Quarterly Service',
    description: 'Quarterly maintenance service for fleet vehicles.',
    category: 'Vehicle',
    items: [
      { step: 1, instruction: 'Change engine oil and filter', passFail: true },
      { step: 2, instruction: 'Replace air filter', passFail: true },
      { step: 3, instruction: 'Rotate tires', passFail: true },
      { step: 4, instruction: 'Record tire tread depth FL', requiresValue: true, unit: '/32"' },
      { step: 5, instruction: 'Record tire tread depth FR', requiresValue: true, unit: '/32"' },
      { step: 6, instruction: 'Record tire tread depth RL', requiresValue: true, unit: '/32"' },
      { step: 7, instruction: 'Record tire tread depth RR', requiresValue: true, unit: '/32"' },
      { step: 8, instruction: 'Check and top off all fluids', passFail: true },
      { step: 9, instruction: 'Inspect belts and hoses', passFail: true },
      { step: 10, instruction: 'Check battery condition and terminals', passFail: true },
    ],
  },

  // ========== GENERAL ==========
  {
    name: 'Building Walkthrough - Monthly',
    description: 'General monthly building inspection walkthrough.',
    category: 'General',
    items: [
      { step: 1, instruction: 'Inspect exterior for damage or maintenance needs', passFail: true },
      { step: 2, instruction: 'Check all exterior lighting', passFail: true },
      { step: 3, instruction: 'Inspect parking lot and sidewalks', passFail: true },
      { step: 4, instruction: 'Check restrooms for leaks and proper operation', passFail: true },
      { step: 5, instruction: 'Inspect common areas for cleanliness and safety', passFail: true },
      { step: 6, instruction: 'Verify exit signs and emergency lighting', passFail: true },
      { step: 7, instruction: 'Check roof drains and gutters if accessible', passFail: true },
      { step: 8, instruction: 'Document any issues found', requiresPhoto: true },
    ],
  },
];
