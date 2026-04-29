interface Pichanga_struct {
    id: string;
    name: string|null;
    admins_name: string[];
    date: string;
    limit_members: number;
    members: { id: string; name: string }[];
    fechaInicioIncripcion: string;
}