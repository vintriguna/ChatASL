"use client";

import { useEffect, useRef, useCallback } from "react";

export function useWebcam() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const attachStreamToVideo = useCallback(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;

    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    void video.play().catch(() => {
      // Ignore autoplay timing errors; user interaction will retry playback.
    });
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!navigator.mediaDevices?.getUserMedia) {
      console.error("Webcam error: getUserMedia is not supported in this browser.");
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" } })
      .then((s) => {
        if (!isMounted) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = s;
        attachStreamToVideo();
      })
      .catch((err) => console.error("Webcam error:", err));

    return () => {
      isMounted = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [attachStreamToVideo]);

  useEffect(() => {
    attachStreamToVideo();
  });

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return null;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.8);
  }, []);

  return { videoRef, captureFrame };
}
