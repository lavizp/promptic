interface TagProps {
  label: string;
}

export function Tag({ label }: TagProps) {
  return <text bg="blue" fg="white">{` #${label} `}</text>;
}
