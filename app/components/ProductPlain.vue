<script setup lang="ts">
import type { PropType } from 'vue'
import type { WorkItCollectionItem } from '@nuxt/content'
import DidapButton from '~/components/DidapButton.vue'
import MediaSlot from '~/components/MediaSlot.vue'
import ProductRow from '~/components/ProductRow.vue'
import StepList from '~/components/StepList.vue'
import { typeset } from '#shared/typeset'

// Il corpo della scheda prodotto scritto per chi non è del mestiere
// (`screens`, oggi CityFix), un blocco per tema sotto un filo: il
// problema, cosa abbiamo fatto (i passi e il video che li riassume),
// cosa offre a chi lo usa (un gruppo per cittadino, Comune e ditta),
// cosa ci guadagna il Comune, poi più piccoli la cosa difficile, quanto
// costa e come si parte. Pagina ferma, niente animazioni.
type Screens = NonNullable<WorkItCollectionItem['screens']>

// `challenge` vale se `screens` non ha la sua; `url` e `host` per il
// bottone in fondo
const props = defineProps({
  screens: { type: Object as PropType<Screens>, required: true },
  challenge: { type: Object as PropType<{ title: string, body: string }>, default: undefined },
  model: { type: String, default: '' },
  url: { type: String, default: '' },
  host: { type: String, default: '' },
})

const { t } = useI18n()

const challenge = computed(() => props.screens.challenge ?? props.challenge)

// I gruppi di `offers` col fondo dei loro video. Un video solo sta
// accanto al testo; più video stanno in una fascia sotto, affiancati
// alla stessa altezza: ogni colonna è larga quanto la proporzione del
// suo video
const ratio = (r?: string) => {
  const [w, h] = (r ?? '').split('/').map(Number)
  return w && h ? w / h : 1
}
const groups = computed(() => (props.screens.offers?.groups ?? []).map((g) => {
  const media = (g.media ?? []).map(m => ({ ...m, backdrop: m.backdrop ?? props.screens.backdrop }))
  return {
    ...g,
    media,
    single: media.length === 1,
    cols: media.map(m => `${ratio(m.ratio)}fr`).join(' '),
  }
}))
</script>

<template>
  <!-- Il problema, cosa abbiamo fatto -->
  <section
    v-for="b in [
      { id: 'why', label: t('product.why'), ...screens.why },
      { id: 'made', label: t('product.made'), ...screens.made },
    ]"
    :key="b.id"
    data-preview-section="prodotto"
    class="page-x"
    :aria-labelledby="`${b.id}-title`"
  >
    <ProductRow
      :label="b.label"
      class="
        border-t-[1.5px] border-ink pt-8 pb-16
        lg:pb-28
      "
    >
      <div class="flex flex-col gap-7">
        <h2
          :id="`${b.id}-title`"
          class="text-hero"
        >
          {{ typeset(b.title) }}
        </h2>
        <p class="text-body-medium">
          {{ typeset(b.body) }}
        </p>
        <div
          v-if="'steps' in b"
          class="grid items-start gap-6"
          :class="{ 'md:grid-cols-2': b.media }"
        >
          <StepList
            v-if="b.steps?.length"
            :steps="b.steps"
            :row="!b.media"
          />
          <MediaSlot
            v-if="b.media"
            :media="b.media"
            class="aspect-square w-full"
          />
        </div>
      </div>
    </ProductRow>
  </section>

  <!-- Cosa offre: un gruppo per chi lo usa, con le sue voci e i suoi video -->
  <section
    v-if="screens.offers"
    data-preview-section="cosafa"
    class="page-x"
    aria-labelledby="offers-title"
  >
    <div class="
      border-t-[1.5px] border-ink pt-8 pb-16
      lg:pb-28
    ">
      <ProductRow :label="t('product.offers')">
        <h2
          id="offers-title"
          class="text-hero"
        >
          {{ typeset(screens.offers.title) }}
        </h2>
      </ProductRow>
      <div
        v-for="g in groups"
        :key="g.label"
        class="
          mt-12 border-t border-ink pt-8
          lg:mt-20
        "
      >
        <div class="
          grid gap-6
          lg:grid-cols-[302fr_954fr]
        ">
          <p class="text-label opacity-70">
            {{ typeset(g.label) }}
          </p>
          <div
            class="grid items-start gap-8"
            :class="{ 'md:grid-cols-2': g.single }"
          >
            <div class="flex flex-col gap-6">
              <h3 class="text-title">
                {{ typeset(g.title) }}
              </h3>
              <ul
                class="grid gap-x-6 gap-y-5"
                :class="{ 'offer-items-row': !g.single }"
                :style="{ '--n': g.items.length }"
              >
                <li
                  v-for="item in g.items"
                  :key="item.name"
                  class="grid content-start gap-1.5 border-t border-ink/30 pt-4"
                >
                  <span class="text-body-medium">{{ typeset(item.name) }}</span>
                  <span class="text-base/normal opacity-70">{{ typeset(item.desc) }}</span>
                </li>
              </ul>
            </div>
            <div
              v-if="g.single"
              class="offer-tile"
              :style="{ '--backdrop': g.media[0]!.backdrop, '--ratio': g.media[0]!.ratio }"
            >
              <MediaSlot
                :media="g.media[0]"
                class="offer-video"
              />
            </div>
          </div>
        </div>
        <div
          v-if="!g.single && g.media.length"
          class="
            offer-band mt-10
            lg:mt-12
          "
          :style="{ '--cols': g.cols }"
        >
          <div
            v-for="m in g.media"
            :key="m.src"
            class="offer-tile"
            :style="{ '--backdrop': m.backdrop, '--ratio': m.ratio }"
          >
            <MediaSlot
              :media="m"
              class="offer-video"
            />
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Per il Comune: cosa ci guadagna chi decide -->
  <section
    v-if="screens.payoff"
    data-preview-section="cosafa"
    class="page-x"
    aria-labelledby="payoff-title"
  >
    <ProductRow
      :label="t('product.payoff')"
      class="
        border-t-[1.5px] border-ink pt-8 pb-16
        lg:pb-28
      "
    >
      <div class="flex flex-col gap-7">
        <h2
          id="payoff-title"
          class="text-hero"
        >
          {{ typeset(screens.payoff.title) }}
        </h2>
        <div
          class="grid items-start gap-6"
          :class="{ 'md:grid-cols-2': screens.payoff.media }"
        >
          <p class="text-body-medium">
            {{ typeset(screens.payoff.body) }}
          </p>
          <MediaSlot
            v-if="screens.payoff.media"
            :media="screens.payoff.media"
            class="aspect-square w-full"
          />
        </div>
      </div>
    </ProductRow>
  </section>

  <!-- In fondo, più piccoli: la cosa difficile, quanto costa e come si
       parte, una riga ciascuno -->
  <section
    v-if="challenge || model || screens.start?.length"
    data-preview-section="chiusura"
    class="page-x"
  >
    <div class="
      flex flex-col divide-y divide-ink border-t-[1.5px] border-ink pb-16
      lg:pb-28
    ">
      <ProductRow
        v-if="challenge"
        :label="t('product.challenge')"
        class="py-8"
      >
        <div class="flex flex-col gap-5">
          <h2 class="text-title">
            {{ typeset(challenge.title) }}
          </h2>
          <p class="text-body-medium">
            {{ typeset(challenge.body) }}
          </p>
        </div>
      </ProductRow>
      <ProductRow
        v-if="model"
        :label="t('product.model')"
        class="py-8"
      >
        <p class="text-body-medium">
          {{ typeset(model) }}
        </p>
      </ProductRow>
      <ProductRow
        v-if="screens.start?.length"
        :label="t('product.start')"
        class="py-8"
      >
        <div class="flex flex-col items-start gap-8">
          <StepList
            :steps="screens.start"
            row
            class="w-full"
          />
          <DidapButton
            v-if="url"
            :href="url"
          >
            {{ t('product.open', { host }) }}
          </DidapButton>
        </div>
      </ProductRow>
    </div>
  </section>
</template>

<style scoped>
/* Le voci di un gruppo: in fila (`offer-items-row`, una colonna per
   voce) quando i video stanno nella fascia sotto */
@media (min-width: 40rem) {
  .offer-items-row {
    grid-template-columns: repeat(var(--n), minmax(0, 1fr));
  }
}

/* Un video intero nel suo riquadro 4:5, del colore di fondo del video
   (`backdrop`): alto quanto il riquadro, se è più largo esce dai lati,
   se è più stretto i lati sfumano nel fondo */
.offer-tile {
  position: relative;
  aspect-ratio: 4 / 5;
  overflow: hidden;
  background: var(--backdrop, var(--color-ink));
}

.offer-tile :deep(.offer-video) {
  position: absolute;
  top: 0;
  left: 50%;
  height: 100%;
  width: auto;
  max-width: none;
  aspect-ratio: var(--ratio, 1);
  translate: -50% 0;
  mask-image:
    linear-gradient(to right, transparent, #000 7%, #000 93%, transparent),
    linear-gradient(to bottom, transparent, #000 7%, #000 93%, transparent);
  mask-composite: intersect;
}

/* La fascia: i video affiancati alla stessa altezza, ognuno con le sue
   proporzioni (`--cols`). Su telefono uno sotto l'altro, nel riquadro
   4:5 */
.offer-band {
  display: grid;
  gap: 1.5rem;
}

@media (min-width: 48rem) {
  .offer-band {
    grid-template-columns: var(--cols);
  }

  .offer-band .offer-tile {
    aspect-ratio: var(--ratio, 1);
  }

  .offer-band .offer-tile :deep(.offer-video) {
    left: 0;
    width: 100%;
    translate: none;
    mask-image: none;
  }
}
</style>
