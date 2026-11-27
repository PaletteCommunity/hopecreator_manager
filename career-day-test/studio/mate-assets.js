// Source bytes stay intact; SVG viewports frame their transparent margins.
const official = (id, box) => ({ file: `./assets/mates/official-${id}.png`, width: 335, height: 335, viewBox: box, source: 'official' });
const atlas = box => ({ file: './assets/mates/missing-four-atlas-v1.png', width: 1254, height: 1254, viewBox: box, source: 'reference-based transparent reconstruction' });
export const MATE_ASSETS = {
  flame: official('flame', [73, 66, 189, 203]),
  dutti: official('dutti', [73, 66, 188, 203]),
  mmuni: official('mmuni', [72, 66, 191, 203]),
  inno: official('inno', [71, 66, 193, 203]),
  inou: official('inou', [72, 55, 191, 225]),
  cloody: official('cloody', [70, 66, 195, 203]),
  wiz: atlas([115, 78, 454, 485]),
  vini: atlas([674, 107, 449, 429]),
  mini: atlas([103, 700, 469, 434]),
  intoo: atlas([736, 705, 369, 437]),
};
