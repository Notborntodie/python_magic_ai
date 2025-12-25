
import React, { useRef, useEffect } from 'react';

interface CameraConfig {
  color: string;
  size: number;
  isRunning: boolean;
  poses: Record<string, string>;
}

interface CameraPreviewProps {
  config: CameraConfig;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
}

const CameraPreview: React.FC<CameraPreviewProps> = ({ config }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const linesRef = useRef<{points: {x: number, y: number}[], color: string, size: number}[]>([]);
  const currentLineRef = useRef<{points: {x: number, y: number}[], color: string, size: number} | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    if (!config.isRunning) {
      linesRef.current = [];
      particlesRef.current = [];
      return;
    };

    let active = true;
    const videoElement = videoRef.current!;
    const canvasElement = canvasRef.current!;
    const drawingCanvas = drawingCanvasRef.current!;
    const canvasCtx = canvasElement.getContext('2d')!;
    const drawingCtx = drawingCanvas.getContext('2d')!;

    const hands = new (window as any).Hands({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.6, // 稍微降低阈值以提高灵敏度
      minTrackingConfidence: 0.6
    });

    const onResults = (results: any) => {
      if (!active) return;

      if (canvasElement.width !== videoElement.videoWidth) {
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;
        drawingCanvas.width = videoElement.videoWidth;
        drawingCanvas.height = videoElement.videoHeight;
      }

      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      canvasCtx.translate(canvasElement.width, 0);
      canvasCtx.scale(-1, 1);
      canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        
        // --- 鲁棒手势检测算法 ---
        // 指尖: 8(食), 12(中), 16(无名), 20(小)
        // 指根: 6(食), 10(中), 14(无名), 18(小)
        const isIndexUp = landmarks[8].y < landmarks[6].y;
        const isMiddleUp = landmarks[12].y < landmarks[10].y;
        const isRingDown = landmarks[16].y > landmarks[14].y;
        const isPinkyDown = landmarks[20].y > landmarks[18].y;

        // 判定逻辑:
        // 👆: 只有食指伸出
        const isOneFinger = isIndexUp && !isMiddleUp && isRingDown;
        // ✌️: 食指和中指都伸出
        const isTwoFingers = isIndexUp && isMiddleUp && isRingDown;

        let currentAction = "";
        if (isOneFinger) {
          currentAction = config.poses["👆"] || "";
        } else if (isTwoFingers) {
          currentAction = config.poses["✌️"] || "";
        }

        // 视觉反馈：如果检测到手但没识别出动作，显示半透明白色骨架；识别出动作，显示画笔颜色。
        const feedbackColor = currentAction ? config.color : 'rgba(255, 255, 255, 0.4)';
        (window as any).drawConnectors(canvasCtx, landmarks, (window as any).HAND_CONNECTIONS, {
          color: feedbackColor,
          lineWidth: currentAction ? 4 : 2
        });
        (window as any).drawLandmarks(canvasCtx, landmarks, {
          color: feedbackColor,
          radius: (data: any) => data.index === 8 ? 6 : 2
        });

        // 逻辑处理
        if (currentAction === "清除" || currentAction === "粒子爆发") {
           explode();
        } else if (currentAction === "书写") {
           // 转换坐标 (镜像)
           const x = (1 - landmarks[8].x) * drawingCanvas.width;
           const y = landmarks[8].y * drawingCanvas.height;
           
           if (!currentLineRef.current) {
             currentLineRef.current = { points: [], color: config.color, size: config.size };
             linesRef.current.push(currentLineRef.current);
           }
           currentLineRef.current.points.push({ x, y });
        } else {
           currentLineRef.current = null;
        }
      } else {
        currentLineRef.current = null;
      }
      canvasCtx.restore();

      // 渲染画布内容
      drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
      drawingCtx.lineCap = 'round';
      drawingCtx.lineJoin = 'round';
      
      linesRef.current.forEach(line => {
        if (line.points.length < 2) return;
        drawingCtx.beginPath();
        drawingCtx.strokeStyle = line.color;
        drawingCtx.lineWidth = line.size;
        drawingCtx.shadowBlur = 10;
        drawingCtx.shadowColor = line.color;
        drawingCtx.moveTo(line.points[0].x, line.points[0].y);
        for (let i = 1; i < line.points.length; i++) {
          drawingCtx.lineTo(line.points[i].x, line.points[i].y);
        }
        drawingCtx.stroke();
      });

      // 更新粒子效果
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx; p.y += p.vy; p.alpha -= 0.025;
        if (p.alpha <= 0) { particlesRef.current.splice(i, 1); continue; }
        drawingCtx.fillStyle = p.color;
        drawingCtx.globalAlpha = p.alpha;
        drawingCtx.beginPath();
        drawingCtx.arc(p.x, p.y, Math.random() * 5 + 2, 0, Math.PI * 2);
        drawingCtx.fill();
      }
      drawingCtx.globalAlpha = 1;
    };

    const explode = () => {
      if (linesRef.current.length === 0) return;
      linesRef.current.forEach(line => {
        line.points.forEach((p, i) => {
          if (i % 4 === 0) { // 提高粒子密度
            particlesRef.current.push({
              x: p.x, y: p.y,
              vx: (Math.random() - 0.5) * 18,
              vy: (Math.random() - 0.5) * 18,
              alpha: 1, color: line.color
            });
          }
        });
      });
      linesRef.current = [];
    };

    hands.onResults(onResults);
    
    // 检查浏览器是否支持 getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error('浏览器不支持 getUserMedia');
      alert('您的浏览器不支持摄像头访问。\n\n请确保：\n1. 使用现代浏览器（Chrome、Firefox、Edge）\n2. 使用 HTTPS 或 localhost 访问\n3. 如果使用 IP 地址，请切换到 HTTPS');
      return;
    }

    let camera: any;
    
    // 先手动获取摄像头流
    navigator.mediaDevices.getUserMedia({
      video: { 
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
      }
    }).then((mediaStream) => {
      if (!active) {
        mediaStream.getTracks().forEach(track => track.stop());
        return;
      }
      
      stream = mediaStream;
      videoElement.srcObject = mediaStream;
      videoElement.play().catch((e) => {
        console.error('视频播放失败:', e);
      });

      // 然后创建 MediaPipe Camera 工具
      try {
        camera = new (window as any).Camera(videoElement, {
          onFrame: async () => {
            if (!active) return;
            try { 
              await hands.send({ image: videoElement }); 
            } catch (e) {
              console.warn('Hands processing error:', e);
            }
          },
          width: 1280, 
          height: 720
        });
        
        if (camera && typeof camera.start === 'function') {
          camera.start().catch((error: Error) => {
            console.error('MediaPipe Camera 启动失败:', error);
          });
        }
      } catch (error: any) {
        console.error('创建 Camera 对象失败:', error);
        // 如果 MediaPipe Camera 失败，尝试手动处理视频流
        const processFrame = () => {
          if (!active || videoElement.readyState !== videoElement.HAVE_ENOUGH_DATA) {
            requestAnimationFrame(processFrame);
            return;
          }
          try {
            hands.send({ image: videoElement }).catch((e) => {
              console.warn('Hands send error:', e);
            });
          } catch (e) {
            console.warn('Frame processing error:', e);
          }
          requestAnimationFrame(processFrame);
        };
        processFrame();
      }
    }).catch((error: Error) => {
      console.error('获取摄像头权限失败:', error);
      alert(`摄像头访问失败: ${error.message}\n\n可能的原因：\n1. 需要使用 HTTPS 或 localhost\n2. 需要允许摄像头权限\n3. 摄像头被其他应用占用\n\n如果使用 IP 地址访问，请切换到 HTTPS 或使用 localhost`);
    });

    return () => {
      active = false;
      try {
        // 停止视频流
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          stream = null;
        }
        if (videoElement.srcObject) {
          videoElement.srcObject = null;
        }
        // 停止 MediaPipe Camera
        if (camera && typeof camera.stop === 'function') {
          camera.stop();
        }
        // 关闭 Hands
        if (hands && typeof hands.close === 'function') {
          hands.close();
        }
      } catch (e) {
        console.warn('清理资源时出错:', e);
      }
    };
  }, [config.isRunning, config.color, config.size, JSON.stringify(config.poses)]);

  return (
    <div className="relative w-full h-full">
      <video ref={videoRef} className="hidden" playsInline muted />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />
      <canvas ref={drawingCanvasRef} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
    </div>
  );
};

export default CameraPreview;
