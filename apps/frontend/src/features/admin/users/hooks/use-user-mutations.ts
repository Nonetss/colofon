import { useOrpcMutation } from "@/hooks/use-orpc-mutation"
import { adminUserKeys } from "@/lib/admin-user-keys"
import { authClient, unwrapAuth } from "@/lib/auth-client"
import { orpc } from "@/lib/orpc"

// The table's list plus every other admin user read (lookups by id, the
// search, the overview counters), all keyed under `adminUserKeys.all()`.
const usersKey = adminUserKeys.all()
const listKey = orpc.v1.adminUser.list.key()

export function useUserMutations() {
  const createUser = useOrpcMutation({
    mutationFn: (input: {
      name: string
      email: string
      password: string
      role: "user" | "admin"
    }) => unwrapAuth(authClient.admin.createUser(input)),
    success: "Usuario creado",
    error: "No se pudo crear el usuario",
    invalidate: [usersKey, listKey],
  })

  const setUserPassword = useOrpcMutation({
    mutationFn: (input: { userId: string; newPassword: string }) =>
      unwrapAuth(authClient.admin.setUserPassword(input)),
    success: "Contraseña actualizada",
    error: "No se pudo cambiar la contraseña",
  })

  const banUser = useOrpcMutation({
    mutationFn: (input: { userId: string; banReason?: string }) =>
      unwrapAuth(authClient.admin.banUser(input)),
    success: "Usuario baneado",
    error: "No se pudo banear al usuario",
    invalidate: [usersKey, listKey],
  })

  const unbanUser = useOrpcMutation({
    mutationFn: (input: { userId: string }) =>
      unwrapAuth(authClient.admin.unbanUser(input)),
    success: "Baneo retirado",
    error: "No se pudo quitar el baneo",
    invalidate: [usersKey, listKey],
  })

  const removeUser = useOrpcMutation({
    mutationFn: (input: { userId: string }) =>
      unwrapAuth(authClient.admin.removeUser(input)),
    success: "Usuario eliminado",
    error: "No se pudo eliminar el usuario",
    invalidate: [usersKey, listKey],
  })

  const setRole = useOrpcMutation({
    mutationFn: (input: { userId: string; role: "user" | "admin" }) =>
      unwrapAuth(authClient.admin.setRole(input)),
    success: "Rol actualizado",
    error: "No se pudo actualizar el rol",
    invalidate: [usersKey, listKey],
  })

  return {
    createUser,
    setUserPassword,
    banUser,
    unbanUser,
    removeUser,
    setRole,
  }
}
