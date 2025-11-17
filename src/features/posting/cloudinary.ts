const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

if (!CLOUD_NAME || !UPLOAD_PRESET) {
  console.warn('Cloudinary env vars are missing. Check your .env file.');
}

export async function uploadImageAsync(localUri: string): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Cloudinary is not configured.');
  }

  const uriParts = localUri.split('/');
  const fileName = uriParts[uriParts.length - 1] || `upload-${Date.now()}.jpg`;

  const formData = new FormData();
  formData.append('file', {
    uri: localUri,
    type: 'image/jpeg',
    name: fileName,
  } as any);
  formData.append('upload_preset', UPLOAD_PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Cloudinary upload failed:', text);
    throw new Error('Failed to upload image.');
  }

  const data = await res.json();
  if (!data.secure_url) {
    throw new Error('Cloudinary response missing secure_url.');
  }
  return data.secure_url as string;
}
