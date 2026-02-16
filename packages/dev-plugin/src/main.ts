// This is a plugin from Dream's video https://www.youtube.com/watch?v=oHKcQ184aa8
import { Event, PluginContext, SpigotEventType } from '@ecmacraft/types';
import * as Spigot from '@ecmacraft/types/spigot';

const ItemStack = Java.type<typeof Spigot.ItemStack>(
  'org.bukkit.inventory.ItemStack',
);
const Material = Java.type<typeof Spigot.Material>('org.bukkit.Material');
const EntityType = Java.type<typeof Spigot.EntityType>(
  'org.bukkit.entity.EntityType',
);
const Enchantment = Java.type<typeof Spigot.Enchantment>(
  'org.bukkit.enchantments.Enchantment',
);

class PluginHandler {
  @Event('PlayerItemConsumeEvent')
  onPlayerItemConsume(event: SpigotEventType<'PlayerItemConsumeEvent'>) {
    if (
      event.getItem().getType() === Material.POTION ||
      event.getItem().getType() === Material.MILK_BUCKET
    ) {
      return;
    }

    const player = event.getPlayer();
    player.setHealth(0.5);
  }

  @Event('CreatureSpawnEvent')
  onCreatureSpawn(event: SpigotEventType<'CreatureSpawnEvent'>) {
    if (event.getEntityType() === EntityType.CREEPER) {
      const creeper = event.getEntity() as Spigot.Creeper;
      creeper.setPowered(true);
    } else if (event.getEntityType() === EntityType.ZOMBIE) {
      const zombie = event.getEntity() as Spigot.Zombie;
      const helmet = new ItemStack(Material.DIAMOND_HELMET);
      const chestplate = new ItemStack(Material.DIAMOND_CHESTPLATE);
      const leggings = new ItemStack(Material.DIAMOND_LEGGINGS);
      const boots = new ItemStack(Material.DIAMOND_BOOTS);

      zombie.getEquipment().setHelmet(helmet);
      zombie.getEquipment().setChestplate(chestplate);
      zombie.getEquipment().setLeggings(leggings);
      zombie.getEquipment().setBoots(boots);
    } else if (event.getEntityType() === EntityType.SKELETON) {
      const skeleton = event.getEntity() as Spigot.Skeleton;
      const helmet = new ItemStack(Material.DIAMOND_HELMET);
      const chestplate = new ItemStack(Material.DIAMOND_CHESTPLATE);
      const leggings = new ItemStack(Material.DIAMOND_LEGGINGS);
      const boots = new ItemStack(Material.DIAMOND_BOOTS);

      skeleton.getEquipment().setHelmet(helmet);
      skeleton.getEquipment().setChestplate(chestplate);
      skeleton.getEquipment().setLeggings(leggings);
      skeleton.getEquipment().setBoots(boots);

      const bow = new ItemStack(Material.BOW);
      bow.addEnchantment(Enchantment.PUNCH, 2);
      skeleton.getEquipment().setItemInMainHand(bow);
    }
  }
}

export default function main(ctx: PluginContext) {
  ctx.registerHandlers(new PluginHandler());
}
