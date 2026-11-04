/** Where product images are stored. Swappable (e.g. for S3) without touching services. */
export interface StorageProvider {
  save(key: string, data: Buffer, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
  /** Public URL where clients can download the file. */
  publicUrl(key: string): string;
}
