export enum ActionsDataEncripted {
    ChangeName = 'change_name',
}

export default interface DataEncripted {
    action: ActionsDataEncripted;
    id: string;
    max_age?: number; // Opcional, se puede usar para establecer un tiempo de expiración para la acción
    extra?: any;
}