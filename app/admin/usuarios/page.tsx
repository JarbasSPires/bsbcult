import { listUsers } from "@/lib/services/users";
import { formatEventDate } from "@/lib/utils";

export default async function AdminUsersPage() {
  const users = await listUsers();

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-100 text-gray-500">
          <tr>
            <th className="p-3">Nome</th>
            <th className="p-3">Email</th>
            <th className="p-3">Função</th>
            <th className="p-3">Favoritos</th>
            <th className="p-3">Cadastrado em</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b border-gray-50">
              <td className="p-3 font-medium text-gray-900">{user.name}</td>
              <td className="p-3">{user.email}</td>
              <td className="p-3">{user.role}</td>
              <td className="p-3">{user._count.favorites}</td>
              <td className="p-3">{formatEventDate(new Date(user.createdAt))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
