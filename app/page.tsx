'use client';

import { useEffect, useRef, useState } from 'react';

// S3の動画URL
const VIDEO_URL = 'https://toyo-building-signage-dev.s3.ap-northeast-1.amazonaws.com/sample/input1.mp4';

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [syncTime, setSyncTime] = useState(0);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState(0);

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

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      {/* 接続状態インジケーター */}
      <div className="absolute top-4 right-4 flex items-center space-x-2 text-white bg-black/50 px-4 py-2 rounded-lg backdrop-blur-sm">
        <div
          className={`w-3 h-3 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          } animate-pulse`}
        />
        <span className="text-sm font-medium">
          {isConnected ? '同期中' : '接続待機中'}
        </span>
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
          muted // 自動再生のためミュート
          loop={false} // ループはhandleEndedで制御
        >
          お使いのブラウザは動画タグをサポートしていません。
        </video>

        {/* デバッグ情報 */}
        <div className="mt-4 text-white/60 text-xs text-center space-y-1">
          <p>同期時刻: {syncTime.toFixed(2)}秒</p>
          <p>
            現在の再生位置: {videoRef.current?.currentTime.toFixed(2) || '0.00'}秒
          </p>
          <p className="text-white/40 text-[10px] mt-2">
            ※複数のデバイスで開くと、すべてのデバイスが同じ位置で再生されます
          </p>
        </div>
      </div>

      {/* タイトル */}
      <div className="absolute top-4 left-4 text-white">
        <h1 className="text-2xl font-bold drop-shadow-lg">
          同期動画プレーヤー
        </h1>
        <p className="text-sm text-white/80 mt-1">
          複数デバイス間で同期再生
        </p>
      </div>
    </div>
  );
}
