// todo: remove
export default class PrivilegedRequest {
    result: unknown = null;
    next: PrivilegedRequest | null = null;
    type: number = 0;
    intArg: number = 0;
    objArg: unknown = null;
    status: number = 0;
}
