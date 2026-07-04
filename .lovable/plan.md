## Problem

Login e "Wrong PIN. Try again." ashche karon database function `verify_staff_pin` (ebong `set_staff_pin`, `create_staff_with_pin`) internally `crypt(...)` call kore, kintu function-er `search_path` shudhu `public` set kora — `pgcrypto`-r `crypt` function `extensions` schema-y thake, tai `function crypt(text, text) does not exist` error hoy ebong RPC empty result return kore. App seta "wrong PIN" hishebe dekhay.

Admin PIN (`8520`) hash-er against thik ache — verify kora holo — shudhu function search_path-er issue.

## Fix

Ekta migration diye tinte function-er `search_path` update kore `extensions` schema add korbo (function body unchanged):

- `verify_staff_pin(_staff_id uuid, _pin text)` → `SET search_path = public, extensions`
- `set_staff_pin(_staff_id uuid, _old_pin text, _new_pin text)` → same
- `create_staff_with_pin(_name text, _role text, _pin text)` → same

Ei change-er por Admin (8520), Mostakim (2222), Raju (1111) shobai login korte parbe. Kono app code / UI change lagbena.