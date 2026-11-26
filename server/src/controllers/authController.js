export function createAuthController(authService) {
  return {
    async login(req, res) {
      const user = await authService.login(req.validated.body);
      res.json({ user });
    },
  };
}
