import React from 'react';
import {
  ArchiveBoxIcon,
  BoltIcon,
  BookOpenIcon,
  CpuChipIcon,
  CubeIcon,
  FaceSmileIcon,
  HomeModernIcon,
  MusicalNoteIcon,
  SparklesIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';

const iconClass = 'h-7 w-7 text-primary-600';

export function CategoryGlyph({ name }: { name: string }): React.ReactElement {
  const n = name.toLowerCase();
  if (n.includes('tecnolog') || n.includes('electr') || n.includes('comput'))
    return <CpuChipIcon className={iconClass} aria-hidden />;
  if (n.includes('ropa') || n.includes('vest') || n.includes('moda'))
    return <SparklesIcon className={iconClass} aria-hidden />;
  if (n.includes('hogar') || n.includes('casa') || n.includes('decor'))
    return <HomeModernIcon className={iconClass} aria-hidden />;
  if (n.includes('deporte') || n.includes('ejerc') || n.includes('fit'))
    return <BoltIcon className={iconClass} aria-hidden />;
  if (n.includes('salud') || n.includes('belle') || n.includes('cosm'))
    return <FaceSmileIcon className={iconClass} aria-hidden />;
  if (n.includes('libro') || n.includes('educ') || n.includes('estud'))
    return <BookOpenIcon className={iconClass} aria-hidden />;
  if (n.includes('auto') || n.includes('vehíc') || n.includes('moto'))
    return <TruckIcon className={iconClass} aria-hidden />;
  if (n.includes('juguet') || n.includes('niñ') || n.includes('bebé'))
    return <ArchiveBoxIcon className={iconClass} aria-hidden />;
  if (n.includes('música') || n.includes('instru') || n.includes('audio'))
    return <MusicalNoteIcon className={iconClass} aria-hidden />;
  return <CubeIcon className={iconClass} aria-hidden />;
}
