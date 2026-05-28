// Type stubs for modules without bundled declarations

declare module "circomlibjs" {
  interface CirField {
    // Converts an internal field element (LE Montgomery bytes) to a standard BigInt.
    // This is the correct way to read a Poseidon hash result.
    toObject(fe: Uint8Array): bigint;
  }
  interface PoseidonFn {
    (inputs: (bigint | string | number)[]): Uint8Array;
    F: CirField;
  }
  export function buildPoseidon(): Promise<PoseidonFn>;
}

declare module "snarkjs" {
  export const groth16: {
    fullProve(
      input: Record<string, unknown>,
      wasmFile: string,
      zkeyFile: string
    ): Promise<{ proof: unknown; publicSignals: string[] }>;
    verify(
      vKey: unknown,
      publicSignals: string[],
      proof: unknown
    ): Promise<boolean>;
  };
}
