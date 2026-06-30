import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fileName = searchParams.get('file');

    if (!fileName) {
      return NextResponse.json({ error: "File name is required" }, { status: 400 });
    }

    // Safety check to prevent directory traversal
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      return NextResponse.json({ error: "Invalid file name" }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), 'src/data/games', fileName);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    return NextResponse.json({ content });

  } catch (error: any) {
    console.error("Error reading file:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
