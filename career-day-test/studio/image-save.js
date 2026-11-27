import { createProfileImage } from './profile-image.js';

async function pngBlob(canvas) {
  if (typeof canvas.toBlob === 'function') {
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (blob) return blob;
  }
  const data = canvas.toDataURL('image/png');
  if (!data.startsWith('data:image/png;base64,')) throw Error('PNG could not be created');
  const bytes = Uint8Array.from(atob(data.split(',')[1]), c => c.charCodeAt(0));
  return new Blob([bytes], { type: 'image/png' });
}

export function createImageSaver(dialog, renderOptions, toast) {
  const preview = dialog.querySelector('#image-save-preview');
  const download = dialog.querySelector('#image-save-download');
  const share = dialog.querySelector('#image-save-share');
  const status = dialog.querySelector('#image-save-status');
  let url = '';
  let file = null;
  let preparing = false;
  let generation = 0;

  function releaseImage() {
    const previousUrl = url;
    url = '';
    file = null;
    preview.removeAttribute('src');
    download.removeAttribute('href');
    if (previousUrl) setTimeout(() => URL.revokeObjectURL(previousUrl), 60000);
  }

  dialog.querySelector('#image-save-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    releaseImage();
    status.textContent = '';
    generation++;
  });

  share.addEventListener('click', () => {
    if (!file) return;
    status.textContent = '';
    const attempt = generation;
    const fallback = () => {
      if (!dialog.open || attempt !== generation) return;
      status.textContent = 'PNG 다운로드를 누르거나 이미지를 길게 눌러 저장해 주세요.';
    };
    try {
      // The PNG already exists, so this call runs in the user's tap event.
      const result = navigator.share({ files: [file] });
      if (!result) fallback();
      else result.catch(error => { if (error.name !== 'AbortError') fallback(); });
    } catch {
      fallback();
    }
  });

  return async function showImage(card, button, shouldOpen) {
    if (preparing || dialog.open) return;
    preparing = true;
    button.disabled = true;
    button.textContent = '이미지 준비 중';
    try {
      const canvas = await createProfileImage(card, renderOptions);
      const png = await pngBlob(canvas);
      if (!shouldOpen()) return;

      const name = card.name.replace(/[^\p{L}\p{N}_ -]/gu, '').trim();
      const filename = name ? `HC_${name}_자기소개카드.png` : 'HC_자기소개카드.png';
      url = URL.createObjectURL(png);
      preview.src = url;
      download.href = url;
      download.download = filename;
      share.hidden = true;
      try {
        if (typeof navigator.share === 'function' && typeof navigator.canShare === 'function') {
          file = new File([png], filename, { type: 'image/png' });
          share.hidden = !navigator.canShare({ files: [file] });
        }
      } catch {
        file = null;
      }
      dialog.showModal();
    } catch {
      releaseImage();
      if (shouldOpen()) toast('카드 이미지를 만들지 못했습니다. 다시 시도해 주세요.');
    } finally {
      preparing = false;
      button.disabled = false;
      button.textContent = '이미지 저장';
    }
  };
}
