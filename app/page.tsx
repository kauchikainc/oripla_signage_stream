'use client';

import { useEffect, useRef, useState } from 'react';

// S3の動画URL
const VIDEO_URL = 'https://toyo-building-signage-dev.s3.ap-northeast-1.amazonaws.com/sample/input1.mp4';

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [syncTime, setSyncTime] = useState(0);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState(0);
  const [isMuted, setIsMuted] = useState(true); // ミュート状態

  useEffect(() => {
    // Server-Sent Eventsで同期状態を受信
    const eventSource = new EventSource('/api/sync');

    eventSource.onopen = () => {
      console.log('SSE接続成功');
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('同期データ受信:', data);

        setSyncTime(data.currentTime);
        setLastSyncTimestamp(data.timestamp);

        // 動画の再生位置を同期
        if (videoRef.current) {
          const currentVideoTime = videoRef.current.currentTime;
          const timeDiff = Math.abs(currentVideoTime - data.currentTime);

          // 1秒以上のズレがある場合のみ調整
          if (timeDiff > 1.0) {
            console.log(`再生位置を調整: ${currentVideoTime.toFixed(2)}s → ${data.currentTime.toFixed(2)}s`);
            videoRef.current.currentTime = data.currentTime;
          }

          // 再生状態を同期
          if (data.isPlaying && videoRef.current.paused) {
            videoRef.current.play().catch(console.error);
          } else if (!data.isPlaying && !videoRef.current.paused) {
            videoRef.current.pause();
          }
        }
      } catch (error) {
        console.error('同期データの解析エラー:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE接続エラー:', error);
      setIsConnected(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // 動画のメタデータが読み込まれたら自動再生
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      console.log('動画メタデータ読み込み完了:', {
        duration: videoRef.current.duration,
        videoWidth: videoRef.current.videoWidth,
        videoHeight: videoRef.current.videoHeight,
      });

      // 初期再生位置を同期時刻に設定
      videoRef.current.currentTime = syncTime;

      // 自動再生を試行
      videoRef.current.play().catch((error) => {
        console.error('自動再生失敗:', error);
        // iOS Safariなどでは、ユーザー操作が必要な場合がある
      });
    }
  };

  // 動画が終了したらループ
  const handleEnded = () => {
    if (videoRef.current) {
      console.log('動画終了、ループ再生');
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(console.error);
    }
  };

  // ミュート切り替え
  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 gap-6">
      {/* ヘッダー部分 */}
      <div className="w-full max-w-6xl flex justify-between items-center mb-4">
        {/* タイトル */}
        <div className="text-white">
          <h1 className="text-2xl font-bold drop-shadow-lg">
            同期動画プレーヤー
          </h1>
          <p className="text-sm text-white/80 mt-1">
            複数デバイス間で同期再生
          </p>
        </div>

        {/* 接続状態インジケーター */}
        <div className="flex items-center space-x-2 text-white bg-black/50 px-4 py-2 rounded-lg backdrop-blur-sm">
          <div
            className={`w-3 h-3 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            } animate-pulse`}
          />
          <span className="text-sm font-medium">
            {isConnected ? '同期中' : '接続待機中'}
          </span>
        </div>
      </div>

      {/* 動画プレーヤー */}
      <div className="w-full max-w-6xl">
        <video
          ref={videoRef}
          src={VIDEO_URL}
          className="w-full h-auto rounded-lg shadow-2xl"
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          playsInline // iOS対応
          muted={isMuted} // ミュート状態を制御
          loop={false} // ループはhandleEndedで制御
        >
          お使いのブラウザは動画タグをサポートしていません。
        </video>
      </div>

      {/* コントロール部分 */}
      <div className="w-full max-w-6xl flex flex-col items-center gap-4">
        {/* ミュート解除ボタン */}
        <button
          onClick={toggleMute}
          className="flex items-center space-x-2 text-white bg-black/70 hover:bg-black/90 px-6 py-3 rounded-full backdrop-blur-sm transition-all shadow-lg"
        >
          {isMuted ? (
            <>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
              <span className="font-medium">音声をONにする</span>
            </>
          ) : (
            <>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
              <span className="font-medium">音声ON</span>
            </>
          )}
        </button>

        {/* デバッグ情報 */}
        <div className="text-white/60 text-xs text-center space-y-1">
          <p>同期時刻: {syncTime.toFixed(2)}秒</p>
          <p>
            現在の再生位置: {videoRef.current?.currentTime.toFixed(2) || '0.00'}秒
          </p>
          <p className="text-white/40 text-[10px] mt-2">
            ※複数のデバイスで開くと、すべてのデバイスが同じ位置で再生されます
          </p>
        </div>
      </div>
    </div>
  );
}
