interface ErrorBoxProps {
  message: string;
}

export function ErrorBox({ message }: ErrorBoxProps) {
  return (
    <box borderStyle="single" borderColor="red" padding={1}>
      <text fg="red">Error: {message}</text>
    </box>
  );
}
