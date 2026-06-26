import { useEffect, useState } from "react";

export function useRotatingPastImages({
  hasCurrentRoundImage,
  isSubmitting,
  pastImages,
}: {
  hasCurrentRoundImage: boolean;
  isSubmitting: boolean;
  pastImages: string[];
}) {
  const [galleryImageIndex, setGalleryImageIndex] = useState(0);
  const [isGalleryImageVisible, setIsGalleryImageVisible] = useState(true);

  useEffect(() => {
    const shouldShowGallery = isSubmitting && !hasCurrentRoundImage && pastImages.length > 0;

    if (!shouldShowGallery || pastImages.length < 2) return;

    let fadeTimeout: number | undefined;
    const interval = window.setInterval(() => {
      setIsGalleryImageVisible(false);
      fadeTimeout = window.setTimeout(() => {
        setGalleryImageIndex((index) => (index + 1) % pastImages.length);
        setIsGalleryImageVisible(true);
      }, 450);
    }, 4500);

    return () => {
      window.clearInterval(interval);
      if (fadeTimeout) window.clearTimeout(fadeTimeout);
    };
  }, [hasCurrentRoundImage, isSubmitting, pastImages.length]);

  return {
    currentGalleryImage: pastImages[galleryImageIndex % pastImages.length],
    isGalleryImageVisible,
  };
}
