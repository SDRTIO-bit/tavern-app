import MessageList from "./MessageList";
import InputBox from "./InputBox";
import StatusBar from "./StatusBar";
import RuntimeConsole from "./RuntimeConsole";

export default function ChatWindow() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-900">
      <MessageList />
      <RuntimeConsole />
      <InputBox />
      <StatusBar />
    </div>
  );
}
