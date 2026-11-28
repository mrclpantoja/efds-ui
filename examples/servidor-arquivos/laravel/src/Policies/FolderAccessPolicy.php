<?php

namespace Efds\Files\Policies;

use Illuminate\Contracts\Auth\Authenticatable;

/**
 * Autorização por pasta e por operação (exemplo por prefixo, lido de config('files.acl')).
 * Troque pela sua regra real (papéis, departamentos, ACL no banco) apontando config('files.policy')
 * para outra classe com os mesmos métodos. Cada chamada da API passa por aqui.
 *
 * Regras: prefixo mais longo vence; "{user}" no prefixo vira o id do usuário.
 */
class FolderAccessPolicy
{
    public function list(?Authenticatable $user, string $path): bool
    {
        if ($this->read($user, $path)) {
            return true;
        }
        // Pastas "de passagem": ancestrais de uma pasta que o usuário pode ler.
        foreach ($this->rules($user) as $rule) {
            if (in_array('read', $rule['abilities'], true) && ($path === '/' || str_starts_with($rule['prefix'], $path.'/'))) {
                return true;
            }
        }

        return false;
    }

    public function read(?Authenticatable $user, string $path): bool
    {
        return $this->allows($user, $path, 'read');
    }

    public function write(?Authenticatable $user, string $path): bool
    {
        return $this->allows($user, $path, 'write');
    }

    public function delete(?Authenticatable $user, string $path): bool
    {
        return $this->allows($user, $path, 'delete');
    }

    /** Tem permissão de gravação em alguma pasta? (alimenta `capabilities.write`) */
    public function writeAnywhere(?Authenticatable $user): bool
    {
        foreach ($this->rules($user) as $rule) {
            if (in_array('write', $rule['abilities'], true)) {
                return true;
            }
        }

        return false;
    }

    private function allows(?Authenticatable $user, string $path, string $ability): bool
    {
        $best = null;
        foreach ($this->rules($user) as $rule) {
            $p = $rule['prefix'];
            $inside = $p === '/' || $path === $p || str_starts_with($path, $p.'/');
            if ($inside && ($best === null || strlen($p) > strlen($best['prefix']))) {
                $best = $rule;
            }
        }

        return $best !== null && in_array($ability, $best['abilities'], true);
    }

    /** @return list<array{prefix: string, abilities: list<string>}> */
    private function rules(?Authenticatable $user): array
    {
        if ($user === null) {
            return [];
        }
        $id = (string) $user->getAuthIdentifier();
        $rules = [];
        foreach ((array) config('files.acl', []) as $rule) {
            $prefix = rtrim(str_replace('{user}', $id, (string) $rule['prefix']), '/');
            $rules[] = ['prefix' => $prefix === '' ? '/' : $prefix, 'abilities' => array_values((array) $rule['abilities'])];
        }

        return $rules;
    }
}
