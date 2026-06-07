export const REGIONS = ["Tokyo", "Kyoto", "Osaka", "Fukuoka", "Hokkaido"] as const
export type Region = typeof REGIONS[number]
