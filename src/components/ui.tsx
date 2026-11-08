import { C } from "@/constants/kampusgo";
import { MaterialIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";

export type IconName = ComponentProps<typeof MaterialIcons>["name"];

export function Icon({
  name,
  size = 22,
  color = C.navy,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return <MaterialIcons name={name} size={size} color={color} />;
}

export function LogoMark({
  size = 48,
  inverted = false,
}: {
  size?: number;
  inverted?: boolean;
}) {
  const bg = inverted ? "#FFFFFF" : C.primary;
  const fg = inverted ? C.primary : "#FFFFFF";
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Rect width={48} height={48} rx={14} fill={bg} />
      <Path
        d="M16 34L24 14L32 34H27.5L25.8 29.5H22.2L20.5 34H16ZM22.9 25.8H25.1L24 22.8L22.9 25.8Z"
        fill={fg}
        fillRule="evenodd"
      />
      <Circle cx={33} cy={18} r={3.5} fill={fg} />
    </Svg>
  );
}

// Bayangan kartu: biru halus sesuai DESIGN.md
export const shadow = {
  shadowColor: "#2547D0",
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};
