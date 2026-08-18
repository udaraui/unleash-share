import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';

let _client: BlobServiceClient | null = null;

function getBlobServiceClient(): BlobServiceClient {
  if (!_client) {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING is not set');
    }
    _client = BlobServiceClient.fromConnectionString(connectionString);
  }
  return _client;
}

export function getContainerClient(): ContainerClient {
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'poc-assets';
  return getBlobServiceClient().getContainerClient(containerName);
}

/**
 * Uploads a Buffer to Azure Blob Storage and returns the blob path.
 */
export async function uploadBuffer(
  blobPath: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const containerClient = getContainerClient();
  const blockBlobClient = containerClient.getBlockBlobClient(blobPath);
  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: contentType },
  });
  return blobPath;
}

/**
 * Downloads a blob and returns its content as a Buffer + content type.
 */
export async function downloadBlob(blobPath: string): Promise<{ buffer: Buffer; contentType: string }> {
  const containerClient = getContainerClient();
  const blobClient = containerClient.getBlobClient(blobPath);
  const downloadResponse = await blobClient.download();
  const properties = await blobClient.getProperties();

  const chunks: Buffer[] = [];
  for await (const chunk of downloadResponse.readableStreamBody as AsyncIterable<Buffer>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return {
    buffer: Buffer.concat(chunks),
    contentType: properties.contentType || 'application/octet-stream',
  };
}

/**
 * Checks whether a blob exists.
 */
export async function blobExists(blobPath: string): Promise<boolean> {
  const containerClient = getContainerClient();
  const blobClient = containerClient.getBlobClient(blobPath);
  return blobClient.exists();
}
