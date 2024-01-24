import { OpenAIStream, StreamingTextResponse } from 'ai';
import { SignJWT } from 'jose';
import OpenAI from 'openai';

import { ChatErrorType } from '@/types/fetch';
import { OpenAIChatStreamPayload } from '@/types/openai/chat';

import { createErrorResponse } from '../errorResponse';
import { desensitizeUrl } from './desensitizeUrl';

async function generateToken(apiKey: string, expSeconds: number): Promise<string> {
  const [id, secret] = apiKey.split('.');

  if (!id || !secret) {
    throw new Error('Invalid apiKey');
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const exp = nowSeconds + expSeconds;
  const iat = nowSeconds;

  const jwtConstructor = new SignJWT({ api_key: id })
    .setProtectedHeader({ alg: 'HS256', sign_type: 'SIGN', typ: 'JWT' })
    .setExpirationTime(exp)
    .setIssuedAt(iat);

  return jwtConstructor.sign(new TextEncoder().encode(secret));
}

interface CreateChatCompletionOptions {
  openai: OpenAI;
  payload: OpenAIChatStreamPayload;
}

export const createChatCompletion = async ({ payload, openai }: CreateChatCompletionOptions) => {
  // ============  1. preprocess messages   ============ //
  const { messages, ...params } = payload;

  const token = await generateToken(process.env.OPENAI_API_KEY || '', 60 * 60 * 24 * 30);

  // ============  2. send api   ============ //

  try {
    const response = await openai.chat.completions.create(
      {
        messages,
        ...params,
        stream: true,
      } as unknown as OpenAI.ChatCompletionCreateParamsStreaming,
      { headers: { Accept: '*/*', Authorization: `Bearer ${token}` } },
    );

    const stream = OpenAIStream(response);
    // return new Response(JSON.stringify({ tool_calls: response.choices[0].message.tool_calls }));
    return new StreamingTextResponse(stream);
  } catch (error) {
    let desensitizedEndpoint = openai.baseURL;

    // refs: https://github.com/lobehub/lobe-chat/issues/842
    if (openai.baseURL !== 'https://api.openai.com/v1') {
      desensitizedEndpoint = desensitizeUrl(openai.baseURL);
    }

    // Check if the error is an OpenAI APIError
    if (error instanceof OpenAI.APIError) {
      let errorResult: any;

      // if error is definitely OpenAI APIError, there will be an error object
      if (error.error) {
        errorResult = error.error;
      }
      // Or if there is a cause, we use error cause
      // This often happened when there is a bug of the `openai` package.
      else if (error.cause) {
        errorResult = error.cause;
      }
      // if there is no other request error, the error object is a Response like object
      else {
        errorResult = { headers: error.headers, stack: error.stack, status: error.status };
      }

      // track the error at server side
      console.error(errorResult);

      return createErrorResponse(ChatErrorType.OpenAIBizError, {
        endpoint: desensitizedEndpoint,
        error: errorResult,
      });
    }

    // track the non-openai error
    console.error(error);

    // return as a GatewayTimeout error
    return createErrorResponse(ChatErrorType.InternalServerError, {
      endpoint: desensitizedEndpoint,
      error: JSON.stringify(error),
    });
  }
};
