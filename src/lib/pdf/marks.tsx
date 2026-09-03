import { Circle, Path, Rect, Svg } from '@react-pdf/renderer'

import { palette } from './styles'

/**
 * Tick marks drawn as vector paths.
 *
 * The previous export used ZapfDingbats glyphs for these, which meant the
 * checked state lived in a symbol font rather than in the page content — it did
 * not survive text extraction and rendered inconsistently across viewers. These
 * are plain vectors, so they look identical everywhere and at any zoom.
 */

const BOX = 8

export function CheckedMark() {
  return (
    <Svg width={BOX} height={BOX} viewBox="0 0 8 8" style={{ marginTop: 1.5, marginRight: 4 }}>
      <Rect x={0.4} y={0.4} width={7.2} height={7.2} rx={1} fill={palette.pass} stroke="none" />
      <Path
        d="M2 4.2 L3.4 5.7 L6.1 2.5"
        stroke="#ffffff"
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  )
}

export function NotApplicableMark() {
  return (
    <Svg width={BOX} height={BOX} viewBox="0 0 8 8" style={{ marginTop: 1.5, marginRight: 4 }}>
      <Rect
        x={0.4}
        y={0.4}
        width={7.2}
        height={7.2}
        rx={1}
        fill="#ffffff"
        stroke={palette.line}
        strokeWidth={0.7}
      />
      <Path d="M1.6 6.4 L6.4 1.6" stroke={palette.muted} strokeWidth={0.9} strokeLinecap="round" />
    </Svg>
  )
}

export function NotIncludedMark() {
  return (
    <Svg width={BOX} height={BOX} viewBox="0 0 8 8" style={{ marginTop: 1.5, marginRight: 4 }}>
      <Rect
        x={0.4}
        y={0.4}
        width={7.2}
        height={7.2}
        rx={1}
        fill="#ffffff"
        stroke={palette.line}
        strokeWidth={0.7}
      />
    </Svg>
  )
}

export function RadioMark({ selected }: { selected: boolean }) {
  return (
    <Svg width={BOX} height={BOX} viewBox="0 0 8 8" style={{ marginTop: 1.5, marginRight: 4 }}>
      <Circle
        cx={4}
        cy={4}
        r={3.4}
        fill="#ffffff"
        stroke={selected ? palette.pass : palette.line}
        strokeWidth={0.8}
      />
      {selected ? (
        <Path
          d="M2.2 4.1 L3.5 5.4 L5.9 2.6"
          stroke={palette.pass}
          strokeWidth={1.1}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ) : null}
    </Svg>
  )
}
