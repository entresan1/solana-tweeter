import HomePage from '@src/pages/PageHome.vue';
import TopicsPage from '@src/pages/PageTopics.vue';
import UsersPage from '@src/pages/PageUsers.vue';
import ProfilePage from '@src/pages/PageProfile.vue';
import TweetPage from '@src/pages/PageTweet.vue';
import X402Page from '@src/pages/PageX402.vue';
import NotFoundPage from '@src/pages/PageNotFound.vue';

export default [
  {
    name: 'Home',
    path: '/',
    component: HomePage,
  },
  {
    name: 'Topics',
    path: '/topics/:topic?',
    component: TopicsPage,
  },
  {
    name: 'Users',
    path: '/users/:author?',
    component: UsersPage,
  },
  {
    name: 'Profile',
    path: '/profile',
    component: ProfilePage,
  },
  {
    name: 'Tweet',
    path: '/tweet/:tweet',
    component: TweetPage,
  },
  {
    name: 'X402',
    path: '/x402',
    component: X402Page,
  },
  {
    name: 'NotFound',
    path: '/:pathMatch(.*)*',
    component: NotFoundPage,
  },
];
