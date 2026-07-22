/**
 * Uploads a file to Cloudflare R2 via our server-side API endpoint.
 * This completely avoids CORS preflight issues and keeps S3 secret keys secure on the server.
 * 
 * @param file The File or Blob to upload
 * @param folder The folder prefix in R2 (e.g. 'products', 'categories', 'payment-screenshots')
 * @returns Promise<string> Public CDN URL (https://images.mozamandu.com/...)
 */
export async function uploadToR2(
  file: File | Blob,
  folder: string = "uploads"
): Promise<string> {
  const formData = new FormData();
  
  // Ensure the file has a filename if it's a Blob
  if (file instanceof File) {
    formData.append("file", file, file.name);
  } else {
    formData.append("file", file, `${folder}-${Date.now()}.webp`);
  }
  
  formData.append("folder", folder);

  const response = await fetch("/api/upload-r2", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error || `Upload failed with status ${response.status}`;
    throw new Error(message);
  }

  const data = await response.json();
  if (!data.url) {
    throw new Error("No URL returned from R2 upload server");
  }

  return data.url;
}
