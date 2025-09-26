// assets/js/detection.js
(() => {
  const videoEl = document.getElementById('cam');
  const canvasEl = document.getElementById('overlay');
  const ctx = canvasEl.getContext('2d');
  const btnStart = document.getElementById('btnStart');
  const btnStop = document.getElementById('btnStop');

  let camera = null;
  let running = false;

  // ปรับ canvas ให้เท่าขนาดวิดีโอ
  function resizeCanvas() {
    canvasEl.width = videoEl.videoWidth || 640;
    canvasEl.height = videoEl.videoHeight || 480;
  }

  // สร้างตัวตรวจจับหน้า
  const faceDetection = new FaceDetection.FaceDetection({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`,
  });
  faceDetection.setOptions({
    modelSelection: 0,           // 0 = ใกล้, 1 = ไกล
    minDetectionConfidence: 0.5,
  });

  // เวลามีผลลัพธ์
  faceDetection.onResults((results) => {
    if (!running) return;
    resizeCanvas();
    // วาดภาพจากวิดีโอลงพื้นหลัง (optional)
    ctx.save();
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    ctx.drawImage(results.image, 0, 0, canvasEl.width, canvasEl.height);

    // วาดกรอบหน้า
    if (results.detections && results.detections.length) {
      results.detections.forEach((det) => {
        const bbox = det.locationData.relativeBoundingBox;
        const x = bbox.xMin * canvasEl.width;
        const y = bbox.yMin * canvasEl.height;
        const w = bbox.width * canvasEl.width;
        const h = bbox.height * canvasEl.height;

        // กรอบ
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#00FF00';
        ctx.strokeRect(x, y, w, h);

        // คะแนนความมั่นใจ
        const score = (det.score[0] * 100).toFixed(1) + '%';
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(x, y - 24, ctx.measureText(score).width + 12, 22);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '16px sans-serif';
        ctx.fillText(score, x + 6, y - 8);
      });
    }
    ctx.restore();
  });

  async function start() {
    if (running) return;
    running = true;

    // ขอสิทธิ์กล้อง
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
      audio: false,
    });
    videoEl.srcObject = stream;

    await new Promise((r) => (videoEl.onloadedmetadata = r));
    resizeCanvas();

    // ใช้ CameraUtils เพื่อ feed เฟรมเข้า faceDetection
    camera = new Camera(videoEl, {
      onFrame: async () => {
        if (!running) return;
        await faceDetection.send({ image: videoEl });
      },
      width: 640,
      height: 480,
    });
    camera.start();
  }

  function stop() {
    running = false;
    if (camera) {
      camera.stop();
      camera = null;
    }
    const stream = videoEl.srcObject;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      videoEl.srcObject = null;
    }
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  }

  btnStart.addEventListener('click', start);
  btnStop.addEventListener('click', stop);
})();
