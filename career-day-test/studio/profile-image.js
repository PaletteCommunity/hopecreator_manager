// A high-resolution export of the same introduction card shown on screen.
// Every answer determines its own measured height; none is shortened for export.
const imageCache = new Map();
const BODY = '"Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
const COLORS = { paper: '#fffdfa', surround: '#faf7f2', header: '#fff0e2', edge: '#e4ae88', rule: '#efe7de', text: '#292a2d', label: '#9e5736', muted: '#82634f', accent: '#ed7940', tag: '#fff5eb', tagEdge: '#efd4bf', experience: '#fff6ec', dopamine: '#fff8f1', dopamineEdge: '#e9b291' };

function rounded(ctx, x, y, width, height, radius) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + width - r, y); ctx.quadraticCurveTo(x + width, y, x + width, y + r); ctx.lineTo(x + width, y + height - r); ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height); ctx.lineTo(x + r, y + height); ctx.quadraticCurveTo(x, y + height, x, y + height - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

function linesFor(ctx, value, maxWidth, font) {
  ctx.font = font; const text = String(value ?? '').replace(/\r\n?/gu, '\n'); const lines = []; let line = '';
  for (const char of Array.from(text)) {
    if (char === '\n') { lines.push(line); line = ''; continue; }
    if (line && ctx.measureText(line + char).width > maxWidth) { lines.push(line); line = char; }
    else line += char;
  }
  lines.push(line); return lines;
}

async function sourceFor(asset) {
  if (!asset) return null;
  const href = new URL(asset.file, import.meta.url).href;
  if (!imageCache.has(href)) {
    const promise = new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(Error('Mate image could not be loaded'));
      image.src = href;
    });
    imageCache.set(href, promise); promise.catch(() => imageCache.delete(href));
  }
  return imageCache.get(href);
}

function assetPortrait(ctx, image, asset, x, y, size) {
  if (!image || !asset) return;
  const [sx, sy, sw, sh] = asset.viewBox; const scale = Math.min(size / sw, size / sh);
  ctx.drawImage(image, sx, sy, sw, sh, x + (size - sw * scale) / 2, y + (size - sh * scale) / 2, sw * scale, sh * scale);
}

function textLines(ctx, lines, x, y, lineHeight, font, color) {
  ctx.font = font; ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
}

/** Returns a 1000px-wide PNG-ready canvas, including all profile answers. */
export async function createProfileImage(card, { mates, assets, drawStrokes }) {
  if (document.fonts) {
    await document.fonts.load('800 72px HCDisplay', String(card.name || '가')).catch(() => {});
  }
  const current = mates.find(item => item.id === card.mateId);
  const aspiration = mates.find(item => item.id === card.aspirationMateId);
  const [currentImage, aspirationImage] = await Promise.all([sourceFor(assets[current?.id]), sourceFor(assets[aspiration?.id])]);
  const canvas = document.createElement('canvas'); canvas.width = 1000; canvas.height = 1;
  let ctx = canvas.getContext('2d');
  if (!ctx) throw Error('Canvas is unavailable');

  const frame = { x: 28, y: 28, width: 944, radius: 38 };
  const content = { x: 74, width: 852 };
  const fonts = { name: '800 72px HCDisplay, sans-serif', job: `34px ${BODY}`, label: `600 31px ${BODY}`, body: `44px ${BODY}`, tag: `500 28px ${BODY}`, dopamineLabel: `700 27px ${BODY}`, dopamineText: `600 34px ${BODY}` };
  const identityX = 286;
  const dopamineBox = { width: 256, inset: 17, lineHeight: 43 };
  dopamineBox.x = frame.x + frame.width - 38 - dopamineBox.width;
  const dopamine = card.dopamine?.trim();
  const dopamineLines = dopamine ? linesFor(ctx, card.dopamine, dopamineBox.width - dopamineBox.inset * 2, fonts.dopamineText) : [];
  const dopamineHeight = dopamineLines.length ? 60 + dopamineLines.length * dopamineBox.lineHeight : 0;
  const identityWidth = dopamine ? dopamineBox.x - 22 - identityX : frame.x + frame.width - 38 - identityX;
  const nameLines = linesFor(ctx, card.name, identityWidth, fonts.name);
  const jobLines = card.jobInterest ? linesFor(ctx, card.jobInterest, identityWidth, fonts.job) : [];
  const identityTextHeight = nameLines.length * 84 + (jobLines.length ? 15 + jobLines.length * 46 : 0);
  const headerHeight = Math.max(300, identityTextHeight + 68, dopamineHeight + 68);
  const sections = [
    { kind: 'current', label: '나를 보여주는 경험', value: card.experience, mate: current, image: currentImage },
    { kind: 'aspiration', label: '앞으로 닮고 싶은 모습', value: card.attempts, mate: aspiration, image: aspirationImage },
    { kind: 'concern', label: '진로 고민 · 궁금한 점', value: card.concern },
  ].map((section, index) => {
    const inset = section.kind === 'current' ? 26 : 0;
    const bodyFont = fonts.body;
    const lineHeight = 64;
    const bodyLines = linesFor(ctx, section.value, content.width - inset * 2, bodyFont);
    ctx.font = fonts.label; const labelWidth = ctx.measureText(section.label).width;
    const tagText = section.mate ? `${section.mate.name} · #${section.mate.value}` : '';
    ctx.font = fonts.tag; const tagWidth = tagText ? Math.ceil(ctx.measureText(tagText).width) + 76 : 0;
    const tagOnNextLine = !!tagWidth && labelWidth + tagWidth + 20 > content.width - inset * 2;
    const labelHeight = tagOnNextLine ? 105 : 58;
    const height = inset * 2 + labelHeight + 12 + bodyLines.length * lineHeight;
    return { ...section, inset, bodyFont, lineHeight, bodyLines, labelWidth, tagText, tagWidth, tagOnNextLine, labelHeight, height, gapBefore: index === 0 ? 0 : index === 1 ? 30 : 48 };
  });

  const bodyTop = frame.y + headerHeight + 40;
  const bodyBottom = bodyTop + sections.reduce((sum, section) => sum + section.gapBefore + section.height, 0);
  canvas.height = Math.ceil(bodyBottom + 44 + frame.y);
  ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = COLORS.surround; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const frameHeight = canvas.height - frame.y * 2;
  ctx.save(); rounded(ctx, frame.x, frame.y, frame.width, frameHeight, frame.radius); ctx.clip();
  ctx.fillStyle = COLORS.paper; ctx.fillRect(frame.x, frame.y, frame.width, frameHeight);
  ctx.fillStyle = COLORS.header; ctx.fillRect(frame.x, frame.y, frame.width, headerHeight);
  ctx.fillStyle = COLORS.accent; ctx.beginPath(); ctx.moveTo(frame.x + frame.width - 75, frame.y); ctx.lineTo(frame.x + frame.width, frame.y); ctx.lineTo(frame.x + frame.width, frame.y + 75); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#eed8c4'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(frame.x, frame.y + headerHeight); ctx.lineTo(frame.x + frame.width, frame.y + headerHeight); ctx.stroke();

  const avatarSize = 192, avatarX = 66, avatarY = frame.y + (headerHeight - avatarSize) / 2;
  if (card.strokes?.length) drawStrokes(ctx, card.strokes, avatarSize, avatarX, avatarY);
  else assetPortrait(ctx, currentImage, assets[current?.id], avatarX, avatarY, avatarSize);
  const identityY = frame.y + (headerHeight - identityTextHeight) / 2;
  textLines(ctx, nameLines, identityX, identityY + 68, 84, fonts.name, COLORS.text);
  if (jobLines.length) textLines(ctx, jobLines, identityX, identityY + nameLines.length * 84 + 15 + 33, 46, fonts.job, COLORS.muted);
  if (dopamineLines.length) {
    const dopamineY = frame.y + (headerHeight - dopamineHeight) / 2;
    const textX = dopamineBox.x + dopamineBox.inset;
    rounded(ctx, dopamineBox.x, dopamineY, dopamineBox.width, dopamineHeight, 20);
    ctx.fillStyle = COLORS.dopamine; ctx.fill(); ctx.strokeStyle = COLORS.dopamineEdge; ctx.lineWidth = 2; ctx.stroke();
    textLines(ctx, ['요즘 나의 도파민'], textX, dopamineY + 35, 32, fonts.dopamineLabel, '#864c2d');
    textLines(ctx, dopamineLines, textX, dopamineY + 78, dopamineBox.lineHeight, fonts.dopamineText, '#493226');
  }

  let top = bodyTop;
  for (let index = 0; index < sections.length; index++) {
    const section = sections[index];
    if (index >= 2) { ctx.strokeStyle = COLORS.rule; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(content.x, top + section.gapBefore / 2); ctx.lineTo(content.x + content.width, top + section.gapBefore / 2); ctx.stroke(); }
    top += section.gapBefore;
    if (section.kind === 'current') { rounded(ctx, content.x, top, content.width, section.height, 20); ctx.fillStyle = COLORS.experience; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#f0d8c4'; ctx.stroke(); }
    const innerX = content.x + section.inset, innerY = top + section.inset;
    ctx.font = fonts.label; ctx.fillStyle = section.kind === 'concern' ? '#68615c' : COLORS.label; ctx.textBaseline = 'alphabetic'; ctx.fillText(section.label, innerX, innerY + 35);
    if (section.mate) {
      const tagX = section.tagOnNextLine ? innerX : content.x + content.width - section.inset - section.tagWidth;
      const tagY = innerY + (section.tagOnNextLine ? 47 : 0);
      rounded(ctx, tagX, tagY, section.tagWidth, 58, 14); ctx.fillStyle = COLORS.tag; ctx.fill(); ctx.strokeStyle = COLORS.tagEdge; ctx.lineWidth = 2; ctx.stroke();
      assetPortrait(ctx, section.image, assets[section.mate.id], tagX + 7, tagY + 5, 48);
      ctx.font = fonts.tag; ctx.fillStyle = '#81573d'; ctx.textBaseline = 'middle'; ctx.fillText(section.tagText, tagX + 62, tagY + 29);
    }
    textLines(ctx, section.bodyLines, innerX, innerY + section.labelHeight + 58, section.lineHeight, section.bodyFont, COLORS.text);
    top += section.height;
  }
  ctx.restore(); rounded(ctx, frame.x, frame.y, frame.width, frameHeight, frame.radius); ctx.strokeStyle = COLORS.edge; ctx.lineWidth = 3; ctx.stroke();
  return canvas;
}
