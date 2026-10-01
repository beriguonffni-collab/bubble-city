// Every world-space custom shader must encode depth like Three's PBR materials.
// Otherwise the ocean, foam and particles disagree with the city depth buffer.
export function worldDepth(shader){
 const vertex=shader.vertexShader,fragment=shader.fragmentShader;
 return {...shader,
  vertexShader:'#include <common>\n#include <logdepthbuf_pars_vertex>\n'+vertex.replace(/}\s*$/, '\n#include <logdepthbuf_vertex>\n}'),
  fragmentShader:'#include <logdepthbuf_pars_fragment>\n'+fragment.replace(/void\s+main\s*\(\s*\)\s*{/, 'void main(){\n#include <logdepthbuf_fragment>\n')};
}
