import { Storage } from '@google-cloud/storage';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import path from 'path';

export async function POST(request: Request) {
  const headersList = await headers();
  const origin = headersList.get('origin') || '';
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Referrer-Policy': 'origin'
  };

  try {
    // Initialize storage with ADC
    const storage = new Storage({
      projectId: 'realitygenai',
      // Let ADC handle authentication
      keyFilename: path.join(process.cwd(), 'credentials', 'realitygenai-91609dea9a4a.json')
    });

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const gid = formData.get('gid') as string;

    if (!file || !gid) {
      return NextResponse.json(
        { error: 'File and GID are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get bucket reference
    const bucket = storage.bucket('realitygenai-avatar');
    const fileName = `${gid}-${Date.now()}-${file.name}`;
    const blob = bucket.file(fileName);

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Create write stream
    const blobStream = blob.createWriteStream({
      resumable: false,
      contentType: file.type
    });

    // Handle upload using promises
    await new Promise((resolve, reject) => {
      blobStream.on('error', (error) => reject(error));
      blobStream.on('finish', () => resolve(true));
      blobStream.end(buffer);
    });

    // Make the file public
    await blob.makePublic();

    // Get the public URL
    const publicUrl = `https://storage.googleapis.com/realitygenai-avatar/${fileName}`;
    
    return NextResponse.json({ url: publicUrl }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Upload error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};