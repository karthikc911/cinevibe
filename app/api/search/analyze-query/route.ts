import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import OpenAI from 'openai';
import { logger } from '@/lib/logger';
import { QUERY_ANALYSIS_SYSTEM_PROMPT } from '@/config/prompts';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query } = await request.json();

    if (!query || !query.trim()) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    logger.info('SEARCH_ANALYZER', 'Analyzing search query', {
      query,
      userEmail: session.user.email,
    });

    // Use OpenAI to analyze the query intent
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: QUERY_ANALYSIS_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: query,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');

    logger.info('SEARCH_ANALYZER', 'Query analysis complete', {
      query,
      result,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    logger.error('SEARCH_ANALYZER', 'Error analyzing query', {
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      { error: 'Failed to analyze query', details: error.message },
      { status: 500 }
    );
  }
}

