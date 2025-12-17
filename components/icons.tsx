import React from 'react';

interface IconProps {
  className?: string;
  [key: string]: any;
}

export const UploadIcon: React.FC<IconProps> = ({ className, ...props }) => (
  <i className={`fa-solid fa-arrow-up-from-bracket ${className}`} {...props} />
);

export const AnalyzeIcon: React.FC<IconProps> = ({ className, ...props }) => (
  <i className={`fa-solid fa-wand-magic-sparkles ${className}`} {...props} />
);

export const ResetIcon: React.FC<IconProps> = ({ className, ...props }) => (
  <i className={`fa-solid fa-arrows-rotate ${className}`} {...props} />
);

export const XCircleIcon: React.FC<IconProps> = ({ className, ...props }) => (
  <i className={`fa-solid fa-circle-xmark ${className}`} {...props} />
);

export const SkullIcon: React.FC<IconProps> = ({ className, ...props }) => (
  <i className={`fa-solid fa-skull ${className}`} {...props} />
);

export const SaveIcon: React.FC<IconProps> = ({ className, ...props }) => (
  <i className={`fa-solid fa-floppy-disk ${className}`} {...props} />
);

export const SettingsIcon: React.FC<IconProps> = ({ className, ...props }) => (
  <i className={`fa-solid fa-sliders ${className}`} {...props} />
);

export const RankingIcon: React.FC<IconProps> = ({ className, ...props }) => (
  <i className={`fa-solid fa-list-ol ${className}`} {...props} />
);

export const CopyIcon: React.FC<IconProps> = ({ className, ...props }) => (
  <i className={`fa-solid fa-copy ${className}`} {...props} />
);

export const CheckIcon: React.FC<IconProps> = ({ className, ...props }) => (
  <i className={`fa-solid fa-check ${className}`} {...props} />
);

export const PlusIcon: React.FC<IconProps> = ({ className, ...props }) => (
  <i className={`fa-solid fa-plus ${className}`} {...props} />
);

export const TrashIcon: React.FC<IconProps> = ({ className, ...props }) => (
  <i className={`fa-solid fa-trash-can ${className}`} {...props} />
);

export const LockIcon: React.FC<IconProps> = ({ className, ...props }) => (
  <i className={`fa-solid fa-lock ${className}`} {...props} />
);

export const UnlockIcon: React.FC<IconProps> = ({ className, ...props }) => (
  <i className={`fa-solid fa-lock-open ${className}`} {...props} />
);