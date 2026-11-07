import * as React from "react";
export type IconName = "paddle" | "ball" | "court" | "arrow" | "bag" | "trophy";
export interface IconProps { name: IconName; size?: number; title?: string; className?: string; }
export interface WordmarkProps { size?: "sm" | "md" | "lg"; className?: string; }
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "light" | "outline"; icon?: IconName; iconAfter?: IconName; href?: string; children: React.ReactNode; }
export interface MenuButtonProps { open?: boolean; label?: string; onClick?: () => void; className?: string; }
export type HeadlinePart = string | { text: string; serif: true };
export interface HeadlineProps { size?: "impact" | "h1" | "h2" | "h3"; as?: keyof JSX.IntrinsicElements; align?: "start" | "center";
  parts?: HeadlinePart[]; children?: React.ReactNode; className?: string; }
export interface MarqueeProps { rows: { text: string; serif?: boolean }[]; speed?: number; className?: string; }
export interface CaptionProps { children?: React.ReactNode; bar?: boolean; className?: string; }
export interface PhotoCardProps { src: string; alt?: string; caption: string; tone?: "color" | "mono"; ratio?: string; width?: number | string; className?: string; }
export interface EventCardProps { label?: string; title: string; meta?: string | string[]; icon?: IconName; metaIcon?: IconName; className?: string; }
export interface PaddleTileProps { name: string; year?: string | number; tone?: "crimson" | "paper" | "night" | "split"; className?: string; }
export interface PerforationProps { tone?: "surface" | "night"; pitch?: number; as?: keyof JSX.IntrinsicElements; style?: React.CSSProperties; className?: string; children?: React.ReactNode; }
export interface FooterColumn { label: string; links: { label: string; href?: string }[]; }
export interface FooterPanelProps { parts: HeadlinePart[]; left?: FooterColumn; right?: FooterColumn; action?: { label: string; href?: string };
  legal?: string; baseLinks?: { label: string; href?: string }[]; className?: string; }
