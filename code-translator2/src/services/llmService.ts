const LM_STUDIO_URL = 'http://localhost:1234/v1/chat/completions';
const MODEL = 'google/gemma-4-e4b-qat';

interface TranslationResponse {
  translatedCode: string;
  comments: string[];
  confidence: number;
}

interface StreamCallbacks {
  onChunk?: (chunk: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
}

async function streamCompletion(
  messages: Array<{ role: string; content: string }>,
  callbacks: StreamCallbacks,
  maxTokens: number = 4096
): Promise<string> {
  const { onChunk, onComplete, onError } = callbacks;
  let fullText = '';

  try {
    const response = await fetch(LM_STUDIO_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.3,
        max_tokens: maxTokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`LM Studio API error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        
        const data = trimmed.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullText += content;
            onChunk?.(content);
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }

    onComplete?.(fullText);
    return fullText;
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    onError?.(err);
    throw err;
  }
}

export async function translateWithLLM(
  code: string,
  from: string,
  to: string,
  callbacks?: StreamCallbacks
): Promise<TranslationResponse> {
  const prompt = `You are a code translator. Translate the following ${from} code to ${to}.

Rules:
1. Preserve the exact functionality and logic
2. Use idiomatic ${to} conventions
3. Add comments explaining major language differences
4. Return ONLY valid ${to} code, no explanations

Input code (${from}):
\`\`\`
${code}
\`\`\`

Output (${to}):`;

  try {
    let translatedCode = '';

    if (callbacks) {
      translatedCode = await streamCompletion(
        [
          {
            role: 'system',
            content: 'You are an expert code translator. Translate code between programming languages while preserving functionality.',
          },
          { role: 'user', content: prompt },
        ],
        callbacks,
        4096
      );
    } else {
      const response = await fetch(LM_STUDIO_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: 'system',
              content: 'You are an expert code translator. Translate code between programming languages while preserving functionality.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 4096,
        }),
      });

      if (!response.ok) {
        throw new Error(`LM Studio API error: ${response.status}`);
      }

      const data = await response.json();
      translatedCode = data.choices?.[0]?.message?.content || '';
    }

    // Clean up the response - remove markdown code blocks if present
    translatedCode = translatedCode
      .replace(/^```\w*\n?/i, '')
      .replace(/\n?```$/i, '')
      .trim();

    return {
      translatedCode,
      comments: [`Translated using ${MODEL} via LM Studio`],
      confidence: 0.85,
    };
  } catch (error) {
    console.error('LM Studio translation failed:', error);
    throw new Error(
      'Failed to connect to LM Studio. Make sure it\'s running on port 1234.'
    );
  }
}

export async function explainTranslation(
  originalCode: string,
  translatedCode: string,
  from: string,
  to: string,
  callbacks?: StreamCallbacks
): Promise<string> {
  const prompt = `Explain the key differences between this ${from} code and its ${to} translation.

${from} code:
\`\`\`
${originalCode}
\`\`\`

${to} code:
\`\`\`
${translatedCode}
\`\`\`

Provide a concise explanation of:
1. Major syntax differences
2. Language-specific features used
3. Any potential issues or considerations
4. Best practices for the ${to} version`;

  try {
    let response = '';

    if (callbacks) {
      response = await streamCompletion(
        [
          {
            role: 'system',
            content: 'You are a programming language expert who explains code translations.',
          },
          { role: 'user', content: prompt },
        ],
        callbacks,
        2048
      );
    } else {
      const res = await fetch(LM_STUDIO_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: 'system',
              content: 'You are a programming language expert who explains code translations.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 2048,
        }),
      });

      if (!res.ok) {
        throw new Error(`LM Studio API error: ${res.status}`);
      }

      const data = await res.json();
      response = data.choices?.[0]?.message?.content || 'Could not generate explanation.';
    }

    return response;
  } catch (error) {
    console.error('LM Studio explanation failed:', error);
    return 'Could not connect to LM Studio for explanation.';
  }
}

export async function checkCodeQuality(
  code: string,
  language: string,
  callbacks?: StreamCallbacks
): Promise<string> {
  const prompt = `Review this ${language} code for potential issues, bugs, and improvements:

\`\`\`
${code}
\`\`\`

Provide feedback on:
1. Potential bugs or errors
2. Security concerns
3. Performance optimizations
4. Code style and best practices
5. Suggestions for improvement`;

  try {
    let response = '';

    if (callbacks) {
      response = await streamCompletion(
        [
          {
            role: 'system',
            content: 'You are a senior code reviewer who provides constructive feedback.',
          },
          { role: 'user', content: prompt },
        ],
        callbacks,
        2048
      );
    } else {
      const res = await fetch(LM_STUDIO_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: 'system',
              content: 'You are a senior code reviewer who provides constructive feedback.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.5,
          max_tokens: 2048,
        }),
      });

      if (!res.ok) {
        throw new Error(`LM Studio API error: ${res.status}`);
      }

      const data = await res.json();
      response = data.choices?.[0]?.message?.content || 'Could not generate review.';
    }

    return response;
  } catch (error) {
    console.error('LM Studio code review failed:', error);
    return 'Could not connect to LM Studio for code review.';
  }
}
