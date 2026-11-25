import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import api from "@/lib/api";
import OfficeOperationsPanel, {
  type OfficeOperationApi,
  type OfficeDirectory,
  type OfficeOperationView,
} from "./OfficeOperationsPanel";
const officeApi: OfficeOperationApi = {
  query: async (operation, parameters) =>
    (await api.post<OfficeDirectory>("/office-requests/query", { operation, parameters })).data,
  prepare: async (body) =>
    (await api.post<OfficeOperationView>("/office-requests/prepare", body)).data,
  decision: async (id, action, body) =>
    (await api.post<OfficeOperationView>("/office-requests/" + id + "/" + action, body)).data,
};
export default function OfficeOperationsDialog({
  open,
  onOpenChange,
  returnFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocus: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[calc(100vw-2rem)] max-w-[940px] max-h-[90dvh] overflow-y-auto"
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          returnFocus();
        }}
      >
        <DialogHeader>
          <DialogTitle>Oficina · tareas y agenda</DialogTitle>
          <DialogDescription>
            Revisa y confirma cada cambio antes de guardarlo en la plataforma correspondiente.
          </DialogDescription>
        </DialogHeader>
        <OfficeOperationsPanel api={officeApi} />
        <DialogClose asChild>
          <button type="button" className="min-h-11 rounded-md border px-4 py-2">
            Cerrar
          </button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
