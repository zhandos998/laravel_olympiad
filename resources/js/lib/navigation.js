export function defaultHomePath(user) {
    if (!user) {
        return '/login';
    }

    if (user.role === 'admin') {
        return '/admin';
    }

    if (user.role === 'curator') {
        return '/curator';
    }

    return '/student';
}
