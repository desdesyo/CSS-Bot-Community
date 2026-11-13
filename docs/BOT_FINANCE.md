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
Finance(player) exposes wallet, debt, trust, tension and premium block. Cooperation(player, isTerrorist) returns a 0..1 factor intended to scale cover, trade, rescue, follow and support willingness. One or two isolated bad decisions are treated as normal play and do not turn teammates against a bot. Social friction activates only after **3+ bad decisions within 5 rounds while the bot is in debt**; repeated mistakes gradually lower CT trust/cooperation. Terrorists are more tolerant. This is separate from the mere fact of being temporarily below zero.

## Team repayment
SettleTeamDebt receives teammate membership and available round income. CT teammates contribute equal shares, limited by available income; unpaid debt carries forward. Settlement cannot push a payer below the −3000 credit floor. Purchases are also clamped at the credit floor. T-side settlement is skipped: debtor keeps debt and cannot receive premium cash until repaid.

## Integration boundary
This is an engine-independent economy model. Source SDK hooks still need to feed kills, decisions, purchases, round income and teammate lists; AI behavior must consume Cooperation(). This is not live in-game integration yet.
\n## Gameplay tuning\nTactical urgency is intentionally capped below 0.9 in normal situations. Bots prioritize objectives but do not instantly trade every death, retreat at every low-health state, or hold every sightline perfectly. Traits (courage, teamwork, discipline, adaptability) affect risk and tactical confidence. This is a baseline fairness pass; actual aim reaction, perception errors, pathing and weapon accuracy must be tuned in the live Source SDK bot controller.\n