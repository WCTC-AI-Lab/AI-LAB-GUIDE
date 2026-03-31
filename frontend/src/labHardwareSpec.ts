/**
 * Hardware shown on the home page. GPU fields were checked with `nvidia-smi`; update if the image changes.
 */
export const LAB_HARDWARE_SPEC = {
  gpuType: 'NVIDIA RTX 4000 Ada Generation',
  /** VRAM from nvidia-smi: 20475 MiB */
  vramGigabytes: 20,
  /** Peak FP32 from NVIDIA product spec */
  flopsFp32: '23.7 TFLOPS FP32',
  cpuModel: 'Intel Core i9-14900',
  systemRamGigabytes: 32,
} as const;
