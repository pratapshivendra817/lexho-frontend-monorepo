import { useEffect } from "react";
import { useAppDispatch } from "./useRedux";
import { applyReceipt, receiveMessage, setChatConnected, setCustomerTyping } from "../redux/slices/chatSlice";
import { chatSocket } from "../services/chatSocket";

export function usePartnerChatSocket(enabled: boolean) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!enabled) {
      chatSocket.disconnect();
      return;
    }

    const removeConnectionListener = chatSocket.addConnectionListener(connected => dispatch(setChatConnected(connected)));
    const removeEventListener = chatSocket.addListener(event => {
      if (event.type === "MESSAGE") dispatch(receiveMessage(event.message));
      if (event.type === "TYPING" && event.senderType === "CUSTOMER") {
        dispatch(setCustomerTyping({ orderId: event.orderId, typing: event.typing }));
      }
      if (event.type === "READ") {
        dispatch(applyReceipt({ orderId: event.orderId, messageIds: event.messageIds ?? [], status: "read", readAt: event.readAt }));
      }
      if (event.type === "DELIVERED") {
        dispatch(applyReceipt({ orderId: event.orderId, messageIds: event.messageIds, status: "delivered" }));
      }
    });
    chatSocket.connect().catch(() => dispatch(setChatConnected(false)));

    return () => {
      removeConnectionListener();
      removeEventListener();
      chatSocket.disconnect();
    };
  }, [dispatch, enabled]);
}

