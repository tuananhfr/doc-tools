export const CV_TEMPLATES = [
  { id: 'classic', version: 2, layout: 'standard', accent: '#334155', font: 'Georgia', fontSize: 11 },
  { id: 'modern', version: 2, layout: 'band', accent: '#17605b', font: 'Arial', fontSize: 11 },
  { id: 'compact', version: 1, layout: 'compact', accent: '#374151', font: 'Arial', fontSize: 10 },
  { id: 'executive', version: 1, layout: 'centered', accent: '#102c55', font: 'Georgia', fontSize: 11 },
  { id: 'sidebar', version: 1, layout: 'sidebar', accent: '#005bea', font: 'Arial', fontSize: 11 },
] as const

export type CvTemplateId = (typeof CV_TEMPLATES)[number]['id']

export function cvTemplate(id: CvTemplateId) {
  return CV_TEMPLATES.find(template => template.id === id) ?? CV_TEMPLATES[0]
}
