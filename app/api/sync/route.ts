// 動画の同期状態を管理するAPI (Server-Sent Events)
// すべてのクライアントは同じ動画の再生位置を共有する

let currentTime = 0; // 現在の再生位置（秒）
let isPlaying = true; // 再生状態
let lastUpdateTime = Date.now(); // 最後の更新時刻

// 動画の長さ（秒）
const VIDEO_DURATION = 0; // 0 = 自動検出、クライアント側で設定

// 定期的に再生位置を更新
setInterval(() => {
  if (isPlaying) {
    const now = Date.now();
    const elapsed = (now - lastUpdateTime) / 1000; // 経過時間（秒）
    currentTime += elapsed;

    // 動画の長さが設定されている場合、ループ処理
    if (VIDEO_DURATION > 0 && currentTime >= VIDEO_DURATION) {
      currentTime = 0;
    }

    lastUpdateTime = now;
  }
}, 100); // 100msごとに更新

// Server-Sent Events (SSE) エンドポイント
export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // 初期状態を送信
      const initialData = JSON.stringify({
        currentTime,
        isPlaying,
        timestamp: Date.now(),
      });
      controller.enqueue(encoder.encode(`data: ${initialData}\n\n`));

      // 定期的に状態を送信（1秒ごと）
      const interval = setInterval(() => {
        const data = JSON.stringify({
          currentTime,
          isPlaying,
          timestamp: Date.now(),
        });

        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch (error) {
          clearInterval(interval);
        }
      }, 1000);

      // クライアントが切断したらインターバルをクリア
      return () => {
        clearInterval(interval);
      };
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// 再生位置を更新するエンドポイント
export async function POST(request: Request) {
  const body = await request.json();

  if (typeof body.currentTime === 'number') {
    currentTime = body.currentTime;
    lastUpdateTime = Date.now();
  }

  if (typeof body.isPlaying === 'boolean') {
    isPlaying = body.isPlaying;
    lastUpdateTime = Date.now();
  }

  return Response.json({
    success: true,
    currentTime,
    isPlaying,
  });
}
