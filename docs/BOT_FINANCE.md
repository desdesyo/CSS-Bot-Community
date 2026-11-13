# Bot finance: rewards, credit and team debt

## Wallet and credit
Each bot owns a persistent match wallet. The wallet can go negative to **−3000**. Penalties and purchases may use credit; applying a negative event clamps at the floor. Positive income first repays outstanding debt; only the remainder becomes spendable cash. A bot with debt is premium-blocked.

## Reward defaults
| Event | Reward |
|---|---:|
| Kill | +300 |
| Headshot bonus | +100 |
| Assist | +150 |
| First blood | +500 |
| Trade | +300 |
| Rescue teammate | +500 |
| Cover/save | +250 |
| Plant | +300 |
| Defuse | +600 |
| Clutch win | +1000 |
| Round win | +3250 |
| Last enemy | +300 |
| Grenade kill | +400 |
| Wallbang | +150 |

## Penalty defaults
| Event | Penalty |
|---|---:|
| Bad tactical decision | −200 |
| Suicide | −1000 |
| Teamkill | −1500 |
| Friendly damage | −300 |
| AFK | −250 |
| Lost expensive weapon | −300 |

Call Economy::Apply with player, signed amount, event and round. amount=0 uses default reward/penalty values; a nonzero amount overrides them.

## Debt pressure / cooperation
Finance(player) exposes wallet, debt, trust, tension and premium block. Cooperation(player, isTerrorist) returns a 0..1 factor intended to scale cover, trade, rescue, follow and support willingness. Debt and tension reduce CT cooperation more sharply; T-side tolerance is higher.

## Team repayment
SettleTeamDebt receives teammate membership and available round income. CT teammates contribute equal shares, limited by available income; unpaid debt carries forward. Settlement cannot push a payer below the −3000 credit floor. T-side settlement is skipped: debtor keeps debt and cannot receive premium cash until repaid.

## Integration boundary
This is an engine-independent economy model. Source SDK hooks still need to feed kills, decisions, purchases, round income and teammate lists; AI behavior must consume Cooperation(). This is not live in-game integration yet.
