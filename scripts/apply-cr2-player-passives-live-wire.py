from pathlib import Path

path = Path("games/rare-shift/src/phaser-survival.ts")
source = path.read_text(encoding="utf-8")


def replace_once(label: str, before: str, after: str) -> None:
    global source
    count = source.count(before)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one anchor, found {count}")
    source = source.replace(before, after, 1)
    print(f"PATCHED={label}")


replace_once(
    "player-passive-import",
    '''  resolveCR2OrbitProtocolRuntime,
  resolveCR2SignalProtocolRuntime,
  resolveCR2VectorProtocolRuntime,
  useCR2ProtocolRefractFromLive,''',
    '''  resolveCR2OrbitProtocolRuntime,
  resolveCR2PlayerProtocolRuntime,
  resolveCR2SignalProtocolRuntime,
  resolveCR2VectorProtocolRuntime,
  useCR2ProtocolRefractFromLive,''',
)

replace_once(
    "contact-invulnerability",
    '''  private applyPlayerDamage(amount: number): boolean {
    if (this.elapsedActiveMs - this.lastContactAt < V21_CONTACT_INVULN_MS) return false;
    this.lastContactAt = this.elapsedActiveMs;''',
    '''  private applyPlayerDamage(amount: number): boolean {
    const playerProtocol = resolveCR2PlayerProtocolRuntime(this.buildCR2LiveSnapshot());
    const contactInvulnMs = V21_CONTACT_INVULN_MS + playerProtocol.contactInvulnBonusMs;
    if (this.elapsedActiveMs - this.lastContactAt < contactInvulnMs) return false;
    this.lastContactAt = this.elapsedActiveMs;''',
)

replace_once(
    "pickup-passives",
    '''  private updatePickups(dt: number): void {
    for (const pickup of this.pickups) {
      if (!pickup.active) continue;
      const dx = this.friend.x - pickup.x, dy = this.friend.y - pickup.y, distance = Math.max(0.001, Math.hypot(dx, dy));
      if (pickup.magnetized || distance <= this.pickupRadius) {
        const speed = pickup.magnetized ? 720 : Math.max(180, 460 - distance);
        pickup.x += dx / distance * speed * dt; pickup.y += dy / distance * speed * dt; pickup.view.setPosition(pickup.x, pickup.y);
      }
      if (distance < 24 && this.collectPickup(pickup)) break;
    }
  }''',
    '''  private updatePickups(dt: number): void {
    const playerProtocol = resolveCR2PlayerProtocolRuntime(this.buildCR2LiveSnapshot());
    const effectivePickupRadius = this.pickupRadius + playerProtocol.pickupRadiusBonus;
    for (const pickup of this.pickups) {
      if (!pickup.active) continue;
      const dx = this.friend.x - pickup.x, dy = this.friend.y - pickup.y, distance = Math.max(0.001, Math.hypot(dx, dy));
      if (pickup.magnetized || distance <= effectivePickupRadius) {
        const baseSpeed = pickup.magnetized ? 720 : Math.max(180, 460 - distance);
        const speed = baseSpeed * playerProtocol.pickupAttractionSpeedMultiplier;
        pickup.x += dx / distance * speed * dt; pickup.y += dy / distance * speed * dt; pickup.view.setPosition(pickup.x, pickup.y);
      }
      if (distance < 24 && this.collectPickup(pickup)) break;
    }
  }''',
)

replace_once(
    "repair-passive",
    '''    if (kind === "REPAIR") { this.hp = Math.min(V21_PLAYER_MAX_HP, this.hp + 28); this.statusText.setText("REPAIR // integrity restored."); return false; }''',
    '''    if (kind === "REPAIR") {
      const repairBonusHp = resolveCR2PlayerProtocolRuntime(this.buildCR2LiveSnapshot()).repairBonusHp;
      this.hp = Math.min(V21_PLAYER_MAX_HP, this.hp + 28 + repairBonusHp);
      this.statusText.setText("REPAIR // integrity restored.");
      return false;
    }''',
)

replace_once(
    "movement-passive",
    '''  private updateMovement(dt: number): void {
    let x = (this.moveRight ? 1 : 0) - (this.moveLeft ? 1 : 0) + this.joystickVector.x;
    let y = (this.moveDown ? 1 : 0) - (this.moveUp ? 1 : 0) + this.joystickVector.y;
    const magnitude = Math.hypot(x, y); if (magnitude > 1) { x /= magnitude; y /= magnitude; }
    const next = clampPlayerPosition({ x: this.friend.x + x * PLAYER_SPEED * dt, y: this.friend.y + y * PLAYER_SPEED * dt }); this.friend.setPosition(next.x, next.y);
  }''',
    '''  private updateMovement(dt: number): void {
    let x = (this.moveRight ? 1 : 0) - (this.moveLeft ? 1 : 0) + this.joystickVector.x;
    let y = (this.moveDown ? 1 : 0) - (this.moveUp ? 1 : 0) + this.joystickVector.y;
    const magnitude = Math.hypot(x, y); if (magnitude > 1) { x /= magnitude; y /= magnitude; }
    const moveSpeed = PLAYER_SPEED * resolveCR2PlayerProtocolRuntime(this.buildCR2LiveSnapshot()).moveSpeedMultiplier;
    const next = clampPlayerPosition({ x: this.friend.x + x * moveSpeed * dt, y: this.friend.y + y * moveSpeed * dt }); this.friend.setPosition(next.x, next.y);
  }''',
)

replace_once(
    "player-passive-diagnostics",
    '''    canvas.dataset.protocols = Object.entries(this.protocols).sort(([a], [b]) => a.localeCompare(b)).map(([family, rank]) => `${family}:${rank}`).join(",");
    canvas.dataset.protocolSlotsUsed = String(Object.keys(this.protocols).length);
    canvas.dataset.activeEnemies = String(this.enemies.filter(enemy => enemy.active).length);''',
    '''    canvas.dataset.protocols = Object.entries(this.protocols).sort(([a], [b]) => a.localeCompare(b)).map(([family, rank]) => `${family}:${rank}`).join(",");
    canvas.dataset.protocolSlotsUsed = String(Object.keys(this.protocols).length);
    const playerProtocol = resolveCR2PlayerProtocolRuntime(this.buildCR2LiveSnapshot());
    canvas.dataset.protocolMoveSpeedMultiplier = String(playerProtocol.moveSpeedMultiplier);
    canvas.dataset.protocolContactInvulnMs = String(V21_CONTACT_INVULN_MS + playerProtocol.contactInvulnBonusMs);
    canvas.dataset.protocolRepairBonusHp = String(playerProtocol.repairBonusHp);
    canvas.dataset.protocolPickupRadiusBonus = String(playerProtocol.pickupRadiusBonus);
    canvas.dataset.protocolPickupAttractionMultiplier = String(playerProtocol.pickupAttractionSpeedMultiplier);
    canvas.dataset.activeEnemies = String(this.enemies.filter(enemy => enemy.active).length);''',
)

path.write_text(source, encoding="utf-8")
print(f"PATCH_RESULT={path}")
