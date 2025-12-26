import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Card, Text, Avatar, IconButton, Chip } from 'react-native-paper';

export default function PostCard({ post, author }: any) {
  return (
    <Card style={styles.card}>
      <Card.Title
        title={author?.name || 'Rider'}
        subtitle={new Date(post.createdAt?.seconds * 1000).toDateString()}
        left={(props) => <Avatar.Image {...props} size={40} source={{ uri: author?.photoUrl }} />}
        right={(props) => <IconButton {...props} icon="dots-vertical" />}
      />
      <Card.Content>
        {post.type === 'trip' && (
          <Chip icon="map-marker-distance" style={styles.tripChip}>
            Trip Completed: {post.tripData?.distance}km
          </Chip>
        )}
        <Text variant="bodyMedium" style={styles.content}>{post.content}</Text>
      </Card.Content>
      {post.imageUrl && (
        <Card.Cover source={{ uri: post.imageUrl }} style={styles.image} />
      )}
      <Card.Actions>
        <IconButton icon="thumb-up-outline" />
        <IconButton icon="comment-outline" />
        <IconButton icon="share-variant-outline" />
      </Card.Actions>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 16, marginHorizontal: 16, backgroundColor: '#fff' },
  content: { marginVertical: 8 },
  tripChip: { marginBottom: 8, backgroundColor: '#e0f7fa' },
  image: { height: 200 },
});
