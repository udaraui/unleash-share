import React from 'react';
import { Folder, FileText, FileCodeCorner, BookOpenText, Sheet, SquarePlay, ImageIcon, Archive, File, Globe } from 'lucide-react';

export function getFileIcon(fileName: string, mimeType?: string, size: number = 24, isZippedSite?: boolean) {
  const name = (fileName || '').toLowerCase();
  const mime = (mimeType || '').toLowerCase();
  
  if (isZippedSite) return <Globe size={size} />;
  
  if (mime === 'text/html' || name.endsWith('.html')) return <FileCodeCorner size={size} />;
  
  if (name.endsWith('.doc') || name.endsWith('.docx') || mime.includes('word') || mime.includes('document')) {
    return <BookOpenText size={size} />;
  }

  if (name.endsWith('.csv') || name.endsWith('.xls') || name.endsWith('.xlsx') || mime.includes('excel') || mime.includes('spreadsheet') || mime.includes('csv')) {
    return <Sheet size={size} />;
  }

  if (mime.startsWith('video/') || name.endsWith('.mp4') || name.endsWith('.mov') || name.endsWith('.avi') || name.endsWith('.mkv')) {
    return <SquarePlay size={size} />;
  }

  if (mime.startsWith('image/')) return <ImageIcon size={size} />;
  if (mime === 'application/pdf' || name.endsWith('.pdf')) return <FileText size={size} />;
  if (mime.includes('zip') || mime.includes('rar') || name.endsWith('.zip') || name.endsWith('.rar')) return <Archive size={size} />;
  
  return <File size={size} />;
}
