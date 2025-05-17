import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, chance, name } = body;

    // Validate input
    if (!id || !chance || !name) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    // Return the moonster data in the response
    const moonster = { id, chance, name };
    console.log('Returning moonster data:', moonster);
    return NextResponse.json({ success: true, moonster });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}